import { permanentRedirect } from "next/navigation";

type BlogPostRedirectPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function BlogPostRedirectPage({
  params,
}: BlogPostRedirectPageProps) {
  const { slug } = await params;
  permanentRedirect(`/clanky/${slug}/`);
}
