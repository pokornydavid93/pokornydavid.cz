#!/usr/bin/env python3
"""Generate the 12 expert-review DOCX files from clean public Markdown previews."""

from __future__ import annotations

import html
import re
import shutil
import subprocess
import tempfile
import unicodedata
import zipfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

from lxml import etree
from markdown_it import MarkdownIt
from markdown_it.token import Token


APP_ROOT = Path(__file__).resolve().parents[1]
CONTENT_ROOT = APP_ROOT / "content" / "blog"
OUTPUT_ROOT = APP_ROOT / "review-docx"

NS = {
    "office": "urn:oasis:names:tc:opendocument:xmlns:office:1.0",
    "style": "urn:oasis:names:tc:opendocument:xmlns:style:1.0",
    "text": "urn:oasis:names:tc:opendocument:xmlns:text:1.0",
    "table": "urn:oasis:names:tc:opendocument:xmlns:table:1.0",
    "fo": "urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0",
    "xlink": "http://www.w3.org/1999/xlink",
    "dc": "http://purl.org/dc/elements/1.1/",
    "meta": "urn:oasis:names:tc:opendocument:xmlns:meta:1.0",
    "manifest": "urn:oasis:names:tc:opendocument:xmlns:manifest:1.0",
    "svg": "urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0",
}


def qn(prefix: str, local: str) -> str:
    return f"{{{NS[prefix]}}}{local}"


def element(prefix: str, local: str, parent=None, **attributes):
    node = etree.SubElement(parent, qn(prefix, local)) if parent is not None else etree.Element(qn(prefix, local), nsmap=NS)
    for name, value in attributes.items():
        attr_prefix, attr_local = name.split("__", 1)
        attr_local = attr_local.replace("_", "-")
        node.set(qn(attr_prefix, attr_local), str(value))
    return node


def xml_bytes(root) -> bytes:
    return etree.tostring(root, xml_declaration=True, encoding="UTF-8", pretty_print=True)


def add_style(
    parent,
    name: str,
    family: str,
    *,
    display_name: str | None = None,
    parent_style: str | None = None,
    next_style: str | None = None,
    style_class: str | None = None,
    paragraph: dict[str, str] | None = None,
    text: dict[str, str] | None = None,
):
    attributes = {"style__name": name, "style__family": family}
    if display_name:
        attributes["style__display-name"] = display_name
    if parent_style:
        attributes["style__parent-style-name"] = parent_style
    if next_style:
        attributes["style__next-style-name"] = next_style
    if style_class:
        attributes["style__class"] = style_class
    style_node = element("style", "style", parent, **attributes)
    if paragraph:
        element("style", "paragraph-properties", style_node, **paragraph)
    if text:
        element("style", "text-properties", style_node, **text)
    return style_node


def build_styles_xml():
    root = element("office", "document-styles", office__version="1.3")
    font_faces = element("office", "font-face-decls", root)
    element("style", "font-face", font_faces, style__name="Arial", svg__font_family="Arial")
    element("style", "font-face", font_faces, style__name="Georgia", svg__font_family="Georgia")

    styles = element("office", "styles", root)
    default_paragraph = element("style", "default-style", styles, style__family="paragraph")
    element(
        "style",
        "paragraph-properties",
        default_paragraph,
        fo__line_height="150%",
        fo__orphans="2",
        fo__widows="2",
    )
    element(
        "style",
        "text-properties",
        default_paragraph,
        style__font_name="Arial",
        fo__font_family="Arial",
        fo__font_size="10.5pt",
        fo__color="#262C29",
        fo__language="cs",
        fo__country="CZ",
    )

    add_style(styles, "Standard", "paragraph", display_name="Normal", style_class="text")
    add_style(
        styles,
        "Text_20_body",
        "paragraph",
        display_name="Body",
        parent_style="Standard",
        style_class="text",
        paragraph={
            "fo__margin_top": "0in",
            "fo__margin_bottom": "0.11in",
            "fo__line_height": "150%",
            "fo__orphans": "2",
            "fo__widows": "2",
        },
    )
    add_style(
        styles,
        "ReviewLabel",
        "paragraph",
        display_name="Review label",
        parent_style="Standard",
        paragraph={
            "fo__margin_top": "0in",
            "fo__margin_bottom": "0.14in",
            "fo__keep_with_next": "always",
        },
        text={
            "style__font_name": "Arial",
            "fo__font_family": "Arial",
            "fo__font_size": "8pt",
            "fo__font_weight": "bold",
            "fo__letter_spacing": "0.08in",
            "fo__color": "#35704F",
        },
    )
    add_style(
        styles,
        "Title",
        "paragraph",
        display_name="Title",
        parent_style="Standard",
        next_style="Kicker",
        style_class="chapter",
        paragraph={
            "fo__margin_top": "0in",
            "fo__margin_bottom": "0.18in",
            "fo__line_height": "110%",
            "fo__keep_with_next": "always",
            "fo__keep_together": "always",
        },
        text={
            "style__font_name": "Georgia",
            "fo__font_family": "Georgia",
            "fo__font_size": "26pt",
            "fo__font_weight": "bold",
            "fo__color": "#123C2B",
        },
    )
    add_style(
        styles,
        "Kicker",
        "paragraph",
        display_name="Kicker",
        parent_style="Standard",
        next_style="Subtitle",
        paragraph={"fo__margin_bottom": "0.08in", "fo__keep_with_next": "always"},
        text={
            "style__font_name": "Arial",
            "fo__font_family": "Arial",
            "fo__font_size": "8.5pt",
            "fo__font_weight": "bold",
            "fo__letter_spacing": "0.035in",
            "fo__color": "#35704F",
        },
    )
    add_style(
        styles,
        "Subtitle",
        "paragraph",
        display_name="Subtitle",
        parent_style="Standard",
        next_style="Deck",
        paragraph={
            "fo__margin_bottom": "0.13in",
            "fo__line_height": "145%",
            "fo__keep_with_next": "always",
        },
        text={
            "style__font_name": "Georgia",
            "fo__font_family": "Georgia",
            "fo__font_size": "12.5pt",
            "fo__font_style": "italic",
            "fo__color": "#46504B",
        },
    )
    add_style(
        styles,
        "Deck",
        "paragraph",
        display_name="Lead paragraph",
        parent_style="Standard",
        next_style="Supporting",
        paragraph={
            "fo__margin_bottom": "0.12in",
            "fo__line_height": "150%",
            "fo__keep_with_next": "always",
        },
        text={"fo__font_size": "11.5pt", "fo__color": "#303834"},
    )
    add_style(
        styles,
        "Supporting",
        "paragraph",
        display_name="Caption / supporting text",
        parent_style="Standard",
        paragraph={"fo__margin_bottom": "0.08in"},
        text={"fo__font_size": "9pt", "fo__font_style": "italic", "fo__color": "#66716B"},
    )
    add_style(
        styles,
        "Metadata",
        "paragraph",
        display_name="Review metadata",
        parent_style="Standard",
        paragraph={"fo__margin_bottom": "0.025in", "fo__keep_together": "always"},
        text={"fo__font_size": "9pt", "fo__color": "#66716B"},
    )
    add_style(
        styles,
        "Heading_20_1",
        "paragraph",
        display_name="Heading 2",
        parent_style="Standard",
        next_style="Text_20_body",
        style_class="text",
        paragraph={
            "fo__margin_top": "0.28in",
            "fo__margin_bottom": "0.12in",
            "fo__line_height": "118%",
            "fo__keep_with_next": "always",
            "fo__keep_together": "always",
        },
        text={
            "style__font_name": "Georgia",
            "fo__font_family": "Georgia",
            "fo__font_size": "17pt",
            "fo__font_weight": "bold",
            "fo__color": "#123C2B",
        },
    )
    add_style(
        styles,
        "Heading_20_2",
        "paragraph",
        display_name="Heading 3",
        parent_style="Standard",
        next_style="Text_20_body",
        style_class="text",
        paragraph={
            "fo__margin_top": "0.20in",
            "fo__margin_bottom": "0.08in",
            "fo__line_height": "125%",
            "fo__keep_with_next": "always",
            "fo__keep_together": "always",
        },
        text={
            "style__font_name": "Georgia",
            "fo__font_family": "Georgia",
            "fo__font_size": "12.5pt",
            "fo__font_weight": "bold",
            "fo__color": "#1F4937",
        },
    )
    add_style(
        styles,
        "Heading_20_3",
        "paragraph",
        display_name="Heading 4",
        parent_style="Standard",
        next_style="Text_20_body",
        style_class="text",
        paragraph={
            "fo__margin_top": "0.15in",
            "fo__margin_bottom": "0.06in",
            "fo__keep_with_next": "always",
            "fo__keep_together": "always",
        },
        text={"fo__font_size": "10.5pt", "fo__font_weight": "bold", "fo__color": "#1F4937"},
    )
    add_style(
        styles,
        "MiniHeading",
        "paragraph",
        display_name="Supporting heading",
        parent_style="Standard",
        paragraph={
            "fo__margin_top": "0.13in",
            "fo__margin_bottom": "0.06in",
            "fo__keep_with_next": "always",
            "fo__keep_together": "always",
        },
        text={"fo__font_size": "10.5pt", "fo__font_weight": "bold", "fo__color": "#264F3C"},
    )
    add_style(
        styles,
        "QuoteLead",
        "paragraph",
        display_name="Quote / insight lead",
        parent_style="Standard",
        paragraph={
            "fo__margin_top": "0.10in",
            "fo__margin_bottom": "0in",
            "fo__margin_left": "0.26in",
            "fo__padding_left": "0.17in",
            "fo__padding_top": "0.09in",
            "fo__border_left": "0.025in solid #6F9B80",
            "fo__keep_with_next": "always",
            "fo__keep_together": "always",
        },
        text={
            "style__font_name": "Georgia",
            "fo__font_family": "Georgia",
            "fo__font_size": "11pt",
            "fo__font_weight": "bold",
            "fo__color": "#173F2E",
        },
    )
    add_style(
        styles,
        "Quotations",
        "paragraph",
        display_name="Quote / insight",
        parent_style="Standard",
        paragraph={
            "fo__margin_top": "0in",
            "fo__margin_bottom": "0.10in",
            "fo__margin_left": "0.26in",
            "fo__padding_left": "0.17in",
            "fo__padding_bottom": "0.09in",
            "fo__border_left": "0.025in solid #6F9B80",
            "fo__line_height": "145%",
            "fo__keep_together": "always",
        },
        text={"fo__font_size": "10pt", "fo__color": "#46504B"},
    )
    add_style(
        styles,
        "QuoteList",
        "paragraph",
        display_name="Quote list",
        parent_style="Quotations",
        paragraph={
            "fo__margin_top": "0in",
            "fo__margin_bottom": "0.05in",
            "fo__margin_left": "0.26in",
            "fo__padding_left": "0.17in",
            "fo__border_left": "0.025in solid #6F9B80",
            "fo__keep_together": "always",
        },
    )
    add_style(
        styles,
        "CaseLead",
        "paragraph",
        display_name="Case study context",
        parent_style="Standard",
        paragraph={
            "fo__margin_top": "0.08in",
            "fo__margin_bottom": "0.10in",
            "fo__padding": "0.12in",
            "fo__background_color": "#F3F6F3",
            "fo__border": "0.01in solid #D8E1DB",
            "fo__keep_together": "always",
        },
    )
    add_style(
        styles,
        "ListParagraph",
        "paragraph",
        display_name="List",
        parent_style="Text_20_body",
        paragraph={
            "fo__margin_top": "0in",
            "fo__margin_bottom": "0.055in",
            "fo__line_height": "145%",
            "fo__keep_together": "always",
            "fo__orphans": "2",
            "fo__widows": "2",
        },
    )
    add_style(
        styles,
        "Rule",
        "paragraph",
        display_name="Horizontal rule",
        parent_style="Standard",
        paragraph={
            "fo__margin_top": "0.15in",
            "fo__margin_bottom": "0.17in",
            "fo__padding_bottom": "0.01in",
            "fo__border_bottom": "0.01in solid #C9D4CD",
        },
    )
    add_style(
        styles,
        "Footer",
        "paragraph",
        display_name="Footer",
        parent_style="Standard",
        paragraph={"fo__text_align": "left", "fo__margin_top": "0.08in"},
        text={"fo__font_size": "8pt", "fo__color": "#758079"},
    )

    add_style(
        styles,
        "Strong",
        "text",
        display_name="Strong",
        text={"fo__font_weight": "bold"},
    )
    add_style(
        styles,
        "Emphasis",
        "text",
        display_name="Emphasis",
        text={"fo__font_style": "italic"},
    )
    add_style(
        styles,
        "StrongEmphasis",
        "text",
        display_name="Strong emphasis",
        text={"fo__font_weight": "bold", "fo__font_style": "italic"},
    )
    add_style(
        styles,
        "Code",
        "text",
        display_name="Inline code",
        text={"style__font_name": "Arial", "fo__font_family": "Arial", "fo__background_color": "#F1F3F1"},
    )
    add_style(
        styles,
        "Link",
        "text",
        display_name="Link",
        text={"fo__color": "#245C42", "style__text_underline_style": "solid"},
    )

    for list_name, numbered in (("BulletList", False), ("NumberList", True)):
        list_style = element("text", "list-style", styles, style__name=list_name)
        for level in range(1, 6):
            if numbered:
                level_style = element(
                    "text",
                    "list-level-style-number",
                    list_style,
                    text__level=str(level),
                    style__num_format="01",
                    style__num_suffix=" /",
                )
            else:
                level_style = element(
                    "text",
                    "list-level-style-bullet",
                    list_style,
                    text__level=str(level),
                    text__bullet_char="•",
                )
            element(
                "style",
                "list-level-properties",
                level_style,
                text__space_before=f"{0.23 + level * 0.20:.2f}in",
                text__min_label_width="0.26in",
                text__min_label_distance="0.08in",
            )

    automatic = element("office", "automatic-styles", root)
    page_layout = element("style", "page-layout", automatic, style__name="ReviewPage")
    element(
        "style",
        "page-layout-properties",
        page_layout,
        fo__page_width="8.27in",
        fo__page_height="11.69in",
        style__print_orientation="portrait",
        fo__margin_top="0.72in",
        fo__margin_bottom="0.68in",
        fo__margin_left="0.92in",
        fo__margin_right="0.92in",
    )
    element("style", "footer-style", page_layout)

    master_styles = element("office", "master-styles", root)
    master = element(
        "style",
        "master-page",
        master_styles,
        style__name="Standard",
        style__page_layout_name="ReviewPage",
    )
    footer = element("style", "footer", master)
    footer_p = element("text", "p", footer, text__style_name="Footer")
    footer_p.text = "David Pokorný · odborné review"
    footer_p.append(element("text", "tab"))
    page_number = element("text", "page-number", footer_p, text__select_page="current")
    page_number.text = "1"
    return root


def build_manifest_xml():
    root = element("manifest", "manifest", manifest__version="1.3")
    element(
        "manifest",
        "file-entry",
        root,
        manifest__full_path="/",
        manifest__media_type="application/vnd.oasis.opendocument.text",
        manifest__version="1.3",
    )
    for file_name, media_type in (
        ("content.xml", "text/xml"),
        ("styles.xml", "text/xml"),
        ("meta.xml", "text/xml"),
    ):
        element(
            "manifest",
            "file-entry",
            root,
            manifest__full_path=file_name,
            manifest__media_type=media_type,
        )
    return root


def build_meta_xml(title: str):
    root = element("office", "document-meta", office__version="1.3")
    metadata = element("office", "meta", root)
    title_node = element("dc", "title", metadata)
    title_node.text = title
    creator = element("dc", "creator", metadata)
    creator.text = "David Pokorný"
    generator = element("meta", "generator", metadata)
    generator.text = "PokornyDavid.cz editorial review export"
    created = element("meta", "creation-date", metadata)
    created.text = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    return root


def append_text(parent, value: str):
    if not value:
        return
    if len(parent):
        parent[-1].tail = (parent[-1].tail or "") + value
    else:
        parent.text = (parent.text or "") + value


def inline_plain_text(inline: Token) -> str:
    output: list[str] = []
    for child in inline.children or []:
        if child.type in {"text", "code_inline"}:
            output.append(child.content)
        elif child.type in {"softbreak", "hardbreak"}:
            output.append("\n")
        elif child.type in {"html_inline"}:
            output.append(html.unescape(re.sub(r"<[^>]+>", "", child.content)))
    return "".join(output)


def inline_is_strong_only(inline: Token) -> bool:
    meaningful = [child for child in (inline.children or []) if child.type not in {"softbreak", "hardbreak"}]
    return (
        len(meaningful) >= 3
        and meaningful[0].type == "strong_open"
        and meaningful[-1].type == "strong_close"
        and sum(child.type == "strong_open" for child in meaningful) == 1
        and sum(child.type == "strong_close" for child in meaningful) == 1
    )


def render_inline(paragraph, inline: Token):
    style_stack: list[str] = []
    node_stack = [paragraph]
    for child in inline.children or []:
        if child.type in {"strong_open", "em_open"}:
            style_stack.append("strong" if child.type == "strong_open" else "em")
            style_name = (
                "StrongEmphasis"
                if {"strong", "em"}.issubset(style_stack)
                else "Strong"
                if "strong" in style_stack
                else "Emphasis"
            )
            span = element("text", "span", node_stack[-1], text__style_name=style_name)
            node_stack.append(span)
        elif child.type in {"strong_close", "em_close"}:
            if len(node_stack) > 1:
                node_stack.pop()
            expected = "strong" if child.type == "strong_close" else "em"
            if expected in style_stack:
                style_stack.remove(expected)
        elif child.type == "link_open":
            link = element(
                "text",
                "a",
                node_stack[-1],
                xlink__href=child.attrGet("href") or "",
                text__style_name="Link",
            )
            node_stack.append(link)
        elif child.type == "link_close":
            if len(node_stack) > 1:
                node_stack.pop()
        elif child.type == "code_inline":
            span = element("text", "span", node_stack[-1], text__style_name="Code")
            span.text = child.content
        elif child.type in {"softbreak", "hardbreak"}:
            element("text", "line-break", node_stack[-1])
        elif child.type == "html_inline":
            append_text(node_stack[-1], html.unescape(re.sub(r"<[^>]+>", "", child.content)))
        elif child.type == "text":
            append_text(node_stack[-1], child.content)


@dataclass
class RenderContext:
    blockquote_depth: int = 0
    list_level: int = 0
    in_list_item: bool = False


class OdtRenderer:
    def __init__(self, title: str):
        self.title = title
        self.front_active = False
        self.front_paragraphs = 0
        self.title_seen = False
        self.root = element("office", "document-content", office__version="1.3")
        font_faces = element("office", "font-face-decls", self.root)
        element("style", "font-face", font_faces, style__name="Arial", svg__font_family="Arial")
        element("style", "font-face", font_faces, style__name="Georgia", svg__font_family="Georgia")
        automatic = element("office", "automatic-styles", self.root)
        self._add_table_styles(automatic)
        body = element("office", "body", self.root)
        self.document = element("office", "text", body)

    @staticmethod
    def _add_table_styles(parent):
        table_style = add_style(parent, "ReviewTable", "table")
        element(
            "style",
            "table-properties",
            table_style,
            style__width="6.35in",
            table__align="margins",
            fo__margin_top="0.10in",
            fo__margin_bottom="0.14in",
        )
        column_style = add_style(parent, "ReviewTableColumn", "table-column")
        element("style", "table-column-properties", column_style, style__column_width="2.1in")
        cell_style = add_style(parent, "ReviewTableCell", "table-cell")
        element(
            "style",
            "table-cell-properties",
            cell_style,
            fo__padding="0.08in",
            fo__border="0.01in solid #CDD8D1",
            style__vertical_align="top",
        )
        header_style = add_style(parent, "ReviewTableHeaderCell", "table-cell")
        element(
            "style",
            "table-cell-properties",
            header_style,
            fo__padding="0.08in",
            fo__border="0.01in solid #B7C7BD",
            fo__background_color="#EEF3EF",
            style__vertical_align="middle",
        )

    def add_review_label(self):
        paragraph = element("text", "p", self.document, text__style_name="ReviewLabel")
        paragraph.text = "ODBORNÉ REVIEW"

    def add_review_metadata(self):
        for text in ("Autor: David Pokorný", "Verze: k odbornému review"):
            paragraph = element("text", "p", self.document, text__style_name="Metadata")
            paragraph.text = text
        element("text", "p", self.document, text__style_name="Rule")

    def paragraph_style(self, inline: Token, context: RenderContext) -> str:
        plain = inline_plain_text(inline)
        if self.front_active and context.blockquote_depth == 0 and context.list_level == 0:
            return ("Kicker", "Subtitle", "Deck", "Supporting")[self.front_paragraphs]
        if context.blockquote_depth:
            if context.in_list_item:
                return "QuoteList"
            return "QuoteLead" if inline_is_strong_only(inline) else "Quotations"
        if context.in_list_item:
            return "ListParagraph"
        if plain.startswith("Kontext:"):
            return "CaseLead"
        if inline_is_strong_only(inline):
            return "MiniHeading"
        return "Text_20_body"

    def add_paragraph(self, parent, inline: Token, context: RenderContext):
        if self.front_active and self.front_paragraphs >= 4:
            raise ValueError(f"Unexpected fifth front-matter paragraph in {self.title}")
        style_name = self.paragraph_style(inline, context)
        paragraph = element("text", "p", parent, text__style_name=style_name)
        render_inline(paragraph, inline)
        if self.front_active and context.blockquote_depth == 0 and context.list_level == 0:
            self.front_paragraphs += 1
            if self.front_paragraphs == 4:
                self.add_review_metadata()
                self.front_active = False

    def add_heading(self, parent, level: int, inline: Token):
        if level == 1:
            if self.title_seen:
                raise ValueError(f"Multiple H1 headings in {self.title}")
            self.add_review_label()
            heading = element("text", "h", parent, text__style_name="Title", text__outline_level="1")
            self.title_seen = True
            self.front_active = True
        else:
            style_name = "Heading_20_1" if level == 2 else "Heading_20_2" if level == 3 else "Heading_20_3"
            heading = element(
                "text",
                "h",
                parent,
                text__style_name=style_name,
                text__outline_level=str(min(level, 4)),
            )
        render_inline(heading, inline)

    def add_table(self, parent, tokens: list[Token], start: int) -> int:
        rows: list[tuple[bool, list[Token]]] = []
        current_cells: list[Token] = []
        current_header = False
        index = start + 1
        while index < len(tokens) and tokens[index].type != "table_close":
            token = tokens[index]
            if token.type == "thead_open":
                current_header = True
            elif token.type == "tbody_open":
                current_header = False
            elif token.type == "tr_open":
                current_cells = []
            elif token.type in {"th_open", "td_open"}:
                if index + 1 < len(tokens) and tokens[index + 1].type == "inline":
                    current_cells.append(tokens[index + 1])
            elif token.type == "tr_close":
                rows.append((current_header, current_cells))
            index += 1

        if not rows:
            return index + 1
        table = element("table", "table", parent, table__name="ReviewTable", table__style_name="ReviewTable")
        for _ in range(max(len(cells) for _, cells in rows)):
            element("table", "table-column", table, table__style_name="ReviewTableColumn")
        header_rows = [row for row in rows if row[0]]
        body_rows = [row for row in rows if not row[0]]

        def render_rows(container, source_rows, is_header):
            for _, cells in source_rows:
                row = element("table", "table-row", container)
                for inline in cells:
                    cell = element(
                        "table",
                        "table-cell",
                        row,
                        table__style_name="ReviewTableHeaderCell" if is_header else "ReviewTableCell",
                        office__value_type="string",
                    )
                    paragraph = element(
                        "text",
                        "p",
                        cell,
                        text__style_name="MiniHeading" if is_header else "Text_20_body",
                    )
                    render_inline(paragraph, inline)

        if header_rows:
            header = element("table", "table-header-rows", table)
            render_rows(header, header_rows, True)
        render_rows(table, body_rows, False)
        return index + 1

    def render_blocks(
        self,
        parent,
        tokens: list[Token],
        index: int = 0,
        stop: str | None = None,
        context: RenderContext | None = None,
    ) -> int:
        context = context or RenderContext()
        while index < len(tokens):
            token = tokens[index]
            if token.type == stop:
                return index + 1
            if token.type == "heading_open":
                inline = tokens[index + 1]
                self.add_heading(parent, int(token.tag[1]), inline)
                index += 3
            elif token.type == "paragraph_open":
                self.add_paragraph(parent, tokens[index + 1], context)
                index += 3
            elif token.type == "hr":
                element("text", "p", parent, text__style_name="Rule")
                index += 1
            elif token.type == "blockquote_open":
                index = self.render_blocks(
                    parent,
                    tokens,
                    index + 1,
                    "blockquote_close",
                    RenderContext(
                        blockquote_depth=context.blockquote_depth + 1,
                        list_level=context.list_level,
                        in_list_item=context.in_list_item,
                    ),
                )
            elif token.type in {"bullet_list_open", "ordered_list_open"}:
                numbered = token.type == "ordered_list_open"
                close_type = "ordered_list_close" if numbered else "bullet_list_close"
                list_node = element(
                    "text",
                    "list",
                    parent,
                    text__style_name="NumberList" if numbered else "BulletList",
                )
                index += 1
                while index < len(tokens) and tokens[index].type != close_type:
                    if tokens[index].type != "list_item_open":
                        index += 1
                        continue
                    list_item = element("text", "list-item", list_node)
                    index = self.render_blocks(
                        list_item,
                        tokens,
                        index + 1,
                        "list_item_close",
                        RenderContext(
                            blockquote_depth=context.blockquote_depth,
                            list_level=context.list_level + 1,
                            in_list_item=True,
                        ),
                    )
                index += 1
            elif token.type == "table_open":
                index = self.add_table(parent, tokens, index)
            else:
                index += 1
        return index

    def render(self, tokens: list[Token]):
        self.render_blocks(self.document, tokens)
        if not self.title_seen:
            raise ValueError(f"Missing H1 in {self.title}")
        if self.front_paragraphs != 4:
            raise ValueError(f"Expected four title paragraphs in {self.title}, found {self.front_paragraphs}")
        return self.root


def write_odt(target: Path, title: str, content_root):
    with zipfile.ZipFile(target, "w") as archive:
        archive.writestr(
            "mimetype",
            "application/vnd.oasis.opendocument.text",
            compress_type=zipfile.ZIP_STORED,
        )
        archive.writestr("content.xml", xml_bytes(content_root), compress_type=zipfile.ZIP_DEFLATED)
        archive.writestr("styles.xml", xml_bytes(build_styles_xml()), compress_type=zipfile.ZIP_DEFLATED)
        archive.writestr("meta.xml", xml_bytes(build_meta_xml(title)), compress_type=zipfile.ZIP_DEFLATED)
        archive.writestr(
            "META-INF/manifest.xml",
            xml_bytes(build_manifest_xml()),
            compress_type=zipfile.ZIP_DEFLATED,
        )


def clean_filename(number: str, title: str) -> str:
    safe_title = re.sub(r'[<>:"/\\|?*]', "", title).strip().rstrip(".")
    safe_title = re.sub(r"\s+", " ", safe_title)
    return f"{number} - {safe_title}.docx"


def source_files() -> list[Path]:
    files = sorted(
        CONTENT_ROOT.glob("*/*.preview.md"),
        key=lambda file_path: file_path.name[:2],
    )
    if len(files) != 12:
        raise RuntimeError(f"Expected 12 Markdown previews, found {len(files)}")
    expected_numbers = [f"{number:02d}" for number in range(1, 13)]
    actual_numbers = [file_path.name[:2] for file_path in files]
    if actual_numbers != expected_numbers:
        raise RuntimeError(f"Expected article order 01–12, found {actual_numbers}")
    return files


def first_h1(tokens: Iterable[Token]) -> str:
    token_list = list(tokens)
    for index, token in enumerate(token_list):
        if token.type == "heading_open" and token.tag == "h1":
            return inline_plain_text(token_list[index + 1])
    raise RuntimeError("Markdown preview is missing H1")


def convert_odt_to_docx(odt_files: list[Path], output_root: Path, profile_root: Path):
    command = [
        shutil.which("libreoffice") or shutil.which("soffice") or "libreoffice",
        f"-env:UserInstallation={profile_root.as_uri()}",
        "--headless",
        "--convert-to",
        "docx:Office Open XML Text",
        "--outdir",
        str(output_root),
        *map(str, odt_files),
    ]
    result = subprocess.run(command, capture_output=True, text=True, timeout=180)
    if result.returncode != 0:
        raise RuntimeError(f"LibreOffice conversion failed:\n{result.stdout}\n{result.stderr}")


def main():
    markdown = MarkdownIt("commonmark", {"html": False}).enable("table")
    sources = source_files()
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    for existing in OUTPUT_ROOT.glob("*.docx"):
        existing.unlink()

    generated_names: list[str] = []
    with tempfile.TemporaryDirectory(prefix="pokorny-review-docx-") as temporary:
        temporary_root = Path(temporary)
        odt_root = temporary_root / "odt"
        profile_root = temporary_root / "libreoffice-profile"
        odt_root.mkdir()
        profile_root.mkdir()
        odt_files: list[Path] = []

        for source in sources:
            tokens = markdown.parse(source.read_text(encoding="utf-8"))
            title = first_h1(tokens)
            number = source.name[:2]
            output_name = clean_filename(number, title)
            odt_path = odt_root / output_name.replace(".docx", ".odt")
            content_root = OdtRenderer(title).render(tokens)
            write_odt(odt_path, title, content_root)
            odt_files.append(odt_path)
            generated_names.append(output_name)

        convert_odt_to_docx(odt_files, OUTPUT_ROOT, profile_root)

    missing = [name for name in generated_names if not (OUTPUT_ROOT / name).is_file()]
    outputs = sorted(OUTPUT_ROOT.glob("*.docx"))
    if missing or len(outputs) != 12:
        raise RuntimeError(f"DOCX output mismatch. Missing={missing}, count={len(outputs)}")

    print("Generated 12 expert-review DOCX files:")
    for output in outputs:
        print(f"- {output.name}")


if __name__ == "__main__":
    main()
