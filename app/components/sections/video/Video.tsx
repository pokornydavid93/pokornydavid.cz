import s from "./video.module.css";
import Container from "@/app/ui/container/Container";
import RevealClient from "@/app/ui/animations/RevealClient";
import VideoInteractive from "./VideoInteractive.client";
import VideoCTAButton from "./VideoCTAButton.client";

const Video = () => {
  return (
    <section className={s.videoSection}>
      <Container className={`${s.inner}`}>
        <div className={s.layout}>
          <div className={s.copyCol}>
            <RevealClient engine="io" from="bottom">
              <div className={`${s.headingBlock}`}>
                <p className={s.eyebrow}>O SPOLUPRÁCI</p>
                <h3 className={s.gradientSoft}>
                  Jak spolupráce probíhá v praxi
                </h3>
              </div>
            </RevealClient>

            <RevealClient engine="io" from="bottom">
              <p className={`${s.lede}`}>
                Od prvního kontaktu až po
                konkrétní výstup.
              </p>
            </RevealClient>
          </div>

          <RevealClient engine="io" from="bottom">
            <VideoInteractive
              desktopSrc="/video_h264.mp4"
              desktopPoster="/nahled-video.webp"
              mobileSrc="/video-mobil_h264_720p.mp4"
              mobilePoster="/nahled-mobil.webp"
            />
          </RevealClient>
        </div>

        <div className={s.ctaRow}>
          <RevealClient engine="io" from="bottom">
            <p className={`${s.ctaLead}`}>Co by dávalo smysl u vás ?</p>
          </RevealClient>
          <RevealClient engine="io" from="bottom" className={s.gradientSoft}>
            Začneme krátkým hovorem
          </RevealClient>
          <RevealClient engine="io" from="bottom">
            <p className={s.ctaDescription}>
              Vyberte si, co právě řešíte. Do 24 hodin vám zavolám.
            </p>
          </RevealClient>
          <RevealClient engine="io" from="bottom">
            <VideoCTAButton className={`${s.cta}`}>
              Domluvit konzultaci
            </VideoCTAButton>
          </RevealClient>
        </div>
      </Container>
    </section>
  );
};

export default Video;
