import { ArrowUpRight, BriefcaseBusiness } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { TsukiLayout } from "@/components/TsukiLayout";

export default function Works() {
  const works = trpc.content.works.list.useQuery();
  return <TsukiLayout><section className="tsuki-subhero"><h1>作品</h1></section><section className="tsuki-content-grid tsuki-work-list">{works.data?.length ? works.data.map((work, index) => <article className="tsuki-glass tsuki-work-card" key={work.id}><span>0{index + 1}</span><p>{work.category}</p><h2>{work.title}</h2><div><p>{work.summary}</p>{work.url && <a href={work.url} target="_blank" rel="noreferrer" aria-label={`${work.title}を開く`}><ArrowUpRight size={18} /></a>}</div></article>) : <div className="tsuki-empty tsuki-glass"><BriefcaseBusiness size={25} /><p>作品を準備しています。公開されると、ここに並びます。</p></div>}</section></TsukiLayout>;
}
