import { useMemo } from "react";
import { ArrowUpRight, Plane, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { createQrArtwork, socialIdentity } from "@/lib/boardingPass";
import {
  SITE_PUBLISHED_AT,
  SITE_PUBLISHED_LABEL,
  SITE_URL,
} from "@shared/site";
import type { Profile } from "@shared/profile";
import { departureLabel } from "@shared/departure";
import { trpc } from "@/lib/trpc";

function PaperOutline({ stub = false }: { stub?: boolean }) {
  return (
    <svg
      className="boarding-paper-outline"
      viewBox="0 0 600 400"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        className="boarding-outline-wide"
        d={
          stub
            ? "M13 1H597Q599 1 599 3V397Q599 399 597 399H13Q13 387 1 387V13Q13 13 13 1Z"
            : "M3 1H587Q587 13 599 13V387Q587 387 587 399H3Q1 399 1 397V3Q1 1 3 1Z"
        }
      />
      <path
        className="boarding-outline-narrow"
        d={
          stub
            ? "M13 1H587Q587 13 599 13V397Q599 399 597 399H3Q1 399 1 397V13Q13 13 13 1Z"
            : "M3 1H597Q599 1 599 3V387Q587 387 587 399H13Q13 387 1 387V3Q1 1 3 1Z"
        }
      />
    </svg>
  );
}

function Social({
  label,
  service,
  value,
}: {
  label: string;
  service: "x" | "github";
  value: string;
}) {
  const identity = socialIdentity(value, service);
  return (
    <div className="boarding-social">
      <span>{label}</span>
      {identity ? (
        <a href={identity.url} target="_blank" rel="noopener noreferrer">
          {identity.label}
          <ArrowUpRight size={13} aria-hidden="true" />
        </a>
      ) : (
        <span className="boarding-unset">未設定</span>
      )}
    </div>
  );
}

export default function BoardingPass({
  profile,
  open,
  onOpenChange,
  returnFocus,
}: {
  profile: Profile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocus: () => void;
}) {
  const qr = useMemo(() => createQrArtwork(SITE_URL), []);
  const location = trpc.content.departure.get.useQuery(undefined, {
    enabled: open,
    staleTime: query =>
      query.state.data?.status === "estimated"
        ? 6 * 60 * 60 * 1000
        : 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const departure = departureLabel(
    location.data,
    location.isFetching && !location.data
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="boarding-dialog"
        showCloseButton={false}
        onCloseAutoFocus={event => {
          event.preventDefault();
          returnFocus();
        }}
      >
        <div className="boarding-dialog-header">
          <div>
            <p>TSUKIHARU DEPOT / TICKET DESK</p>
            <DialogTitle>プロフィール搭乗券</DialogTitle>
          </div>
          <DialogClose className="boarding-close" aria-label="搭乗券を閉じる">
            <X size={20} />
          </DialogClose>
        </div>
        <DialogDescription className="boarding-dialog-description">
          あなたの街から、月春の資材置き場へ。プロフィールを載せた記念の搭乗券です。
        </DialogDescription>
        <div className="boarding-printer" aria-hidden="true">
          <div>
            <span>PROFILE TERMINAL</span>
            <i />
            <span>READY TO DEPART</span>
          </div>
          <div className="boarding-printer-slot" />
        </div>
        <div className="boarding-print-output">
          <article
            className="boarding-pass-paper"
            aria-label={`${profile.name}のプロフィール搭乗券`}
          >
            <div className="boarding-pass-main">
              <PaperOutline />
              <header className="boarding-airline">
                <div>
                  <Plane size={24} strokeWidth={1.5} aria-hidden="true" />
                  <strong>
                    TSUKIHARU <span>DEPOT</span>
                  </strong>
                </div>
                <span className="boarding-type">
                  BOARDING PASS
                  <br />
                  <small>搭乗券 / PERSONAL</small>
                </span>
              </header>
              <div className="boarding-ticket-body">
                <div className="boarding-passenger">
                  <div>
                    <span>PASSENGER NAME / 名前</span>
                    <h2>{profile.name}</h2>
                  </div>
                  {profile.avatarUrl && <img src={profile.avatarUrl} alt="" />}
                </div>
                <div className="boarding-route">
                  <div
                    className="boarding-departure"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    <span>FROM / 出発地 · IP推定</span>
                    <strong>{departure.city}</strong>
                    <small>{departure.detail}</small>
                  </div>
                  <div className="boarding-flight-line" aria-hidden="true">
                    <i />
                    <Plane size={23} strokeWidth={1.4} />
                    <i />
                  </div>
                  <div>
                    <span>TO / 目的地</span>
                    <strong>WEB</strong>
                    <small>TSUKIHARU DEPOT</small>
                  </div>
                </div>
                <dl className="boarding-flight-details">
                  <div>
                    <dt>FLIGHT / 便名</dt>
                    <dd>TD 1011</dd>
                  </div>
                  <div>
                    <dt>DATE / サイト公開日</dt>
                    <dd>
                      <time dateTime={SITE_PUBLISHED_AT}>
                        {SITE_PUBLISHED_LABEL}
                      </time>
                    </dd>
                  </div>
                  <div>
                    <dt>GATE</dt>
                    <dd>WEB</dd>
                  </div>
                  <div className="boarding-seat">
                    <dt>SEAT</dt>
                    <dd>11A</dd>
                  </div>
                </dl>
                <a
                  className="boarding-site-link"
                  href={SITE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  tukiharu.xsrv.jp
                  <ArrowUpRight size={15} aria-hidden="true" />
                </a>
                <div className="boarding-socials">
                  <Social label="X / ID" service="x" value={profile.xUrl} />
                  <Social
                    label="GITHUB / ID"
                    service="github"
                    value={profile.githubUrl}
                  />
                </div>
                <div className="boarding-ticket-note">
                  <span>SEQ 001 · CLASS PERSONAL</span>
                  <span>PROFILE SOUVENIR · NOT VALID FOR TRAVEL</span>
                </div>
              </div>
            </div>
            <div className="boarding-pass-stub">
              <PaperOutline stub />
              <header className="boarding-stub-header">
                BOARDING PASS <span>お客様控え</span>
              </header>
              <div className="boarding-stub-copy">
                <span>PASSENGER</span>
                <strong>{profile.name}</strong>
                <p>
                  TD 1011{" "}
                  <span>
                    SEAT <b>11A</b>
                  </span>
                </p>
                <div className="boarding-stub-route">
                  <span>{departure.city}</span>
                  <span aria-hidden="true">→</span>
                  <span>WEB</span>
                </div>
                <span className="boarding-ticket-number">
                  TD / 20261011 / 001
                </span>
              </div>
              <a
                className="boarding-qr-link"
                href={SITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="QRコードのリンク先、月春の資材置き場を開く"
              >
                <svg
                  className="boarding-qr"
                  viewBox={`0 0 ${qr.size} ${qr.size}`}
                  role="img"
                  aria-label={`サイトURLのQRコード：${SITE_URL}`}
                  shapeRendering="crispEdges"
                >
                  <rect width={qr.size} height={qr.size} fill="#fff" />
                  <path d={qr.path} fill="#163c4b" />
                </svg>
                <span>SCAN TO VISIT ↗</span>
              </a>
            </div>
          </article>
        </div>
        <p className="boarding-desk-note">
          出発地はIPによるおおよその地域です。VPNなどにより、実際の場所と異なる場合があります。
        </p>
        <details className="boarding-location-info">
          <summary>出発地の取得について</summary>
          <p>
            搭乗券を開いたとき、接続元のIPアドレスを
            <a
              href="https://ipwhois.io/"
              target="_blank"
              rel="noopener noreferrer"
            >
              IPWhois
            </a>
            へ送信して都市・地域を推定します。GPSは使いません。取得できない場合は「YOUR
            CITY」と表示します。
          </p>
        </details>
      </DialogContent>
    </Dialog>
  );
}
