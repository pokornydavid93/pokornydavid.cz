import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { categoryLabels, type BlogPostMeta } from "@/lib/blog";
import frame from "@/app/ui/media/editorialImageFrame.module.css";
import ArticleNavigationLink from "./ArticleNavigationLink.client";
import { getArticleVisual } from "./articleVisuals";
import s from "./ArticleRelatedStories.module.css";

type ArticleRelatedStoriesProps = {
  relatedPosts: readonly BlogPostMeta[];
};

function StoryImage({ post, lead }: { post: BlogPostMeta; lead: boolean }) {
  const source = post.heroImage ?? getArticleVisual(post.slug)?.src;

  return (
    <span
      className={`${s.image} ${frame.frame} ${lead ? s.leadImage : `${s.sideImage} ${frame.compact}`}`}
      aria-hidden="true"
      data-editorial-image
    >
      {source ? (
        <Image
          alt=""
          fill
          sizes={
            lead
              ? "(max-width: 900px) calc(100vw - 40px), (max-width: 1440px) 55vw, 720px"
              : "(max-width: 620px) 112px, (max-width: 900px) 45vw, (max-width: 1200px) 34vw, (max-width: 1600px) 30vw, 456px"
          }
          src={source}
        />
      ) : (
        <span className={s.imageFallback}>{categoryLabels[post.category]}</span>
      )}
    </span>
  );
}

function Story({ post, index }: { post: BlogPostMeta; index: number }) {
  const lead = index === 0;

  return (
    <li className={lead ? s.leadStory : s.sideStory}>
      <ArticleNavigationLink
        className={lead ? s.leadLink : s.sideLink}
        data-cursor="article"
        data-cursor-no-frame
        data-cursor-no-magnetic
        href={`/clanky/${post.slug}/`}
      >
        <StoryImage lead={lead} post={post} />
        <div className={s.storyCopy}>
          <span className={s.storyMeta}>
            <span className={s.storyNumber}>
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>{categoryLabels[post.category]}</span>
            {post.readingTime ? (
              <span className={s.readingTime}>{post.readingTime}</span>
            ) : null}
          </span>
          <h3 className={s.storyTitle}>{post.title}</h3>
          {lead ? (
            <p className={s.storyExcerpt}>{post.hubDescription ?? post.excerpt}</p>
          ) : null}
          <span className={s.storyArrow} aria-hidden="true">
            <ArrowUpRight size={lead ? 22 : 19} strokeWidth={1.8} />
          </span>
        </div>
      </ArticleNavigationLink>
    </li>
  );
}

export default function ArticleRelatedStories({
  relatedPosts,
}: ArticleRelatedStoriesProps) {
  const stories = relatedPosts.slice(0, 3);
  if (stories.length === 0) return null;

  return (
    <section
      aria-labelledby="related-stories-title"
      className={s.section}
      data-suppress-sticky-cta
    >
      <header className={s.header}>
        <span className={s.eyebrow}>Navazující čtení</span>
        <h2 id="related-stories-title">Další články k tématu</h2>
      </header>

      <ol className={s.stories}>
        {stories.map((post, index) => (
          <Story index={index} key={post.slug} post={post} />
        ))}
      </ol>
    </section>
  );
}
