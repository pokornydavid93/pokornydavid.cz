#!/usr/bin/env python3
"""Validate text parity, structure and public-only safety of article review DOCX files."""

from __future__ import annotations

import hashlib
import html
import json
import re
import unicodedata
import zipfile
from pathlib import Path

from lxml import etree
from markdown_it import MarkdownIt


APP_ROOT = Path(__file__).resolve().parents[1]
CONTENT_ROOT = APP_ROOT / "content" / "blog"
OUTPUT_ROOT = APP_ROOT / "review-docx"
REPORT_ROOT = APP_ROOT / "artifacts" / "article-review-docx"
W = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
ADDED_REVIEW_PARAGRAPHS = {
    "ODBORNÉ REVIEW",
    "Autor: David Pokorný",
    "Verze: k odbornému review",
}
FORBIDDEN_INTERNAL_PATTERNS = [
    r"verificationItems",
    r"needsVerification",
    r"productionNotes",
    r"sourceNote",
    r"sourceBasis",
    r"release status",
    r"release gate",
    r"compliance TODO",
    r"renderer information",
    r"internal editorial",
    r"schemaVersion",
    r"primaryIntent",
    r"estimatedReadTime",
    r"contentStatus",
    r"blocksPublish",
    r"claimRef",
    r"evidenceRequired",
]
MARKDOWN_ARTIFACT_PATTERNS = [
    r"^#{1,6}\s",
    r"^>\s",
    r"^---+$",
    r"^\|?\s*:?-{3,}",
    r"\*\*",
    r"`",
    r"<[/!]?[A-Za-z][^>]*>",
]


def normalize(value: str) -> str:
    return re.sub(
        r"\s+",
        " ",
        unicodedata.normalize("NFC", value).replace("\u00a0", " "),
    ).strip()


def inline_text(token) -> str:
    output: list[str] = []
    for child in token.children or []:
        if child.type in {"text", "code_inline"}:
            output.append(child.content)
        elif child.type in {"softbreak", "hardbreak"}:
            output.append(" ")
        elif child.type == "html_inline":
            output.append(html.unescape(re.sub(r"<[^>]+>", "", child.content)))
    return normalize("".join(output))


def expected_units(tokens) -> list[str]:
    return [
        text
        for token in tokens
        if token.type == "inline" and (text := inline_text(token))
    ]


def paragraph_text(paragraph) -> str:
    pieces: list[str] = []
    for node in paragraph.xpath(".//w:t|.//w:tab|.//w:br", namespaces=W):
        pieces.append(node.text or "" if node.tag.endswith("}t") else " ")
    return normalize("".join(pieces))


def body_paragraphs(document_root):
    return document_root.xpath(".//w:body//w:p", namespaces=W)


def paragraph_style(paragraph) -> str:
    values = paragraph.xpath("./w:pPr/w:pStyle/@w:val", namespaces=W)
    return values[0] if values else ""


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main():
    markdown = MarkdownIt("commonmark", {"html": False}).enable("table")
    sources = sorted(CONTENT_ROOT.glob("*/*.preview.md"), key=lambda path: path.name[:2])
    outputs = sorted(OUTPUT_ROOT.glob("*.docx"))
    if len(sources) != 12 or len(outputs) != 12:
        raise AssertionError(f"Expected 12 sources and 12 DOCX files, found {len(sources)} and {len(outputs)}")
    if any(entry.is_file() and entry.suffix.lower() != ".docx" for entry in OUTPUT_ROOT.iterdir()):
        raise AssertionError("review-docx must contain only final DOCX files")

    file_reports = []
    failures: list[str] = []
    for source, output in zip(sources, outputs, strict=True):
        number = source.name[:2]
        if not output.name.startswith(f"{number} - "):
            failures.append(f"{number}: output filename is not aligned with canonical order: {output.name}")
            continue

        tokens = markdown.parse(source.read_text(encoding="utf-8"))
        expected = expected_units(tokens)
        expected_list_items = sum(token.type == "list_item_open" for token in tokens)
        expected_h2 = sum(token.type == "heading_open" and token.tag == "h2" for token in tokens)
        expected_h3 = sum(token.type == "heading_open" and token.tag == "h3" for token in tokens)
        expected_tables = sum(token.type == "table_open" for token in tokens)

        with zipfile.ZipFile(output) as archive:
            corrupt_member = archive.testzip()
            if corrupt_member:
                failures.append(f"{number}: corrupt ZIP member {corrupt_member}")
            document_root = etree.fromstring(archive.read("word/document.xml"))
            paragraphs = body_paragraphs(document_root)
            visible_paragraphs = [paragraph_text(paragraph) for paragraph in paragraphs]
            actual = [
                text
                for text in visible_paragraphs
                if text and text not in ADDED_REVIEW_PARAGRAPHS
            ]
            if expected != actual:
                mismatch = next(
                    (
                        index
                        for index, (expected_text, actual_text) in enumerate(zip(expected, actual))
                        if expected_text != actual_text
                    ),
                    min(len(expected), len(actual)),
                )
                failures.append(
                    f"{number}: content parity failed at block {mismatch + 1}; expected={len(expected)}, actual={len(actual)}"
                )

            styles = [paragraph_style(paragraph) for paragraph in paragraphs]
            actual_h2 = styles.count("Heading2")
            actual_h3 = styles.count("Heading3")
            if styles.count("Title") != 1:
                failures.append(f"{number}: expected exactly one Title style")
            if actual_h2 != expected_h2 or actual_h3 != expected_h3:
                failures.append(
                    f"{number}: heading style parity failed (H2 {actual_h2}/{expected_h2}, H3 {actual_h3}/{expected_h3})"
                )
            required_styles = {"Reviewlabel", "Title", "Kicker", "Subtitle", "Leadparagraph", "Captionsupportingtext", "Reviewmetadata", "Body", "Heading2"}
            missing_styles = sorted(required_styles.difference(styles))
            if missing_styles:
                failures.append(f"{number}: required paragraph styles missing: {missing_styles}")

            native_list_items = 0
            for paragraph in paragraphs:
                if not paragraph.xpath("./w:pPr/w:numPr", namespaces=W):
                    continue
                style = paragraph_style(paragraph)
                if style != "Title" and not style.startswith("Heading"):
                    native_list_items += 1
            if native_list_items != expected_list_items:
                failures.append(
                    f"{number}: native list parity failed ({native_list_items}/{expected_list_items})"
                )

            actual_tables = len(document_root.xpath(".//w:body//w:tbl", namespaces=W))
            if actual_tables != expected_tables:
                failures.append(f"{number}: native table parity failed ({actual_tables}/{expected_tables})")

            footer_names = [name for name in archive.namelist() if name.startswith("word/footer") and name.endswith(".xml")]
            footer_xml = b"\n".join(archive.read(name) for name in footer_names)
            if not footer_names or b"David Pokorn" not in footer_xml or b"PAGE" not in footer_xml:
                failures.append(f"{number}: footer text or PAGE field missing")

            public_text = "\n".join(visible_paragraphs)
            for pattern in FORBIDDEN_INTERNAL_PATTERNS:
                if re.search(pattern, public_text, flags=re.IGNORECASE):
                    failures.append(f"{number}: internal-language pattern found: {pattern}")
            for paragraph in visible_paragraphs:
                for pattern in MARKDOWN_ARTIFACT_PATTERNS:
                    if re.search(pattern, paragraph):
                        failures.append(f"{number}: Markdown artifact found: {pattern} in {paragraph[:100]!r}")

        file_reports.append(
            {
                "number": number,
                "source": str(source.relative_to(APP_ROOT)),
                "output": output.name,
                "contentBlocks": len(expected),
                "nativeListItems": expected_list_items,
                "nativeTables": expected_tables,
                "sha256": sha256(output),
                "bytes": output.stat().st_size,
            }
        )

    report = {
        "sourceMarkdowns": len(sources),
        "docxOutputs": len(outputs),
        "contentParity": not any("content parity" in failure for failure in failures),
        "nativeStructureParity": not any("native" in failure or "heading style" in failure for failure in failures),
        "internalLanguageScan": not any("internal-language" in failure for failure in failures),
        "markdownArtifactScan": not any("Markdown artifact" in failure for failure in failures),
        "docxIntegrity": not any("corrupt" in failure for failure in failures),
        "failures": failures,
        "files": file_reports,
    }
    REPORT_ROOT.mkdir(parents=True, exist_ok=True)
    report_path = REPORT_ROOT / "validation.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if failures:
        raise AssertionError("DOCX validation failed:\n- " + "\n- ".join(failures))
    print(json.dumps({key: value for key, value in report.items() if key not in {"files", "failures"}}, ensure_ascii=False, indent=2))
    print(f"Validation report: {report_path}")


if __name__ == "__main__":
    main()
