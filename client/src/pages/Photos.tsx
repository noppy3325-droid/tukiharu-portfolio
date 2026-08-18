import { Camera } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { TsukiLayout } from "@/components/TsukiLayout";

function formatDate(date: Date | string | null) { return date ? new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" }).format(new Date(date)) : ""; }

export default function Photos() {
  const photos = trpc.content.gallery.list.useQuery();
  return <TsukiLayout><section className="tsuki-subhero"><h1>写真</h1></section><section className="tsuki-photo-list">{photos.data?.length ? photos.data.map(photo => <article className="tsuki-glass" key={photo.id}><img src={photo.imageUrl} alt={photo.title} /><div><h2>{photo.title}</h2><p>{photo.caption}</p><small>{[photo.camera, photo.lens, photo.location, formatDate(photo.takenAt)].filter(Boolean).join(" · ")}</small></div></article>) : <div className="tsuki-empty tsuki-glass"><Camera size={25} /><p>写真を選んでいます。しばらくお待ちください。</p></div>}</section></TsukiLayout>;
}
