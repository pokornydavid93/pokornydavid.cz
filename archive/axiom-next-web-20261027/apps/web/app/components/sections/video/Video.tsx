import s from "./video.module.css";
import Container from "@/app/ui/container/Container";
import VideoInteractive from "./VideoInteractive.client";

const Video = () => {
  return (
    <section
      className={s.videoSection}
      data-surface-tone="dark"
      data-video-section
    >
      <Container className={`${s.inner}`}>
        <div className={s.copyCol} data-video-copy>
          <div className={s.headingBlock}>
            <p className={s.eyebrow}>KRÁTKÉ PŘEDSTAVENÍ</p>
            <h2 className={s.heading}>Nejdřív poznat situaci. Až potom řešení.</h2>
          </div>
          <p className={s.lede}>
            Podívejte se, jak přemýšlím nad finančním plánem a proč má úvodní
            přehled přednost před rychlým doporučením.
          </p>
        </div>

        <div className={s.videoGridItem} data-video-grid-item>
          <div className={s.videoGridPayload} data-video-grid-payload>
            <VideoInteractive
              desktopSrc="/video_h264.mp4"
              desktopPoster="/nahled-video.avif"
              mobileSrc="/video-mobil_h264_720p.mp4"
              mobilePoster="/nahled-mobil.avif"
            />
          </div>
        </div>
      </Container>
    </section>
  );
};

export default Video;
