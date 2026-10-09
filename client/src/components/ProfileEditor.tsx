import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AdminImageUpload } from "./AdminImageUpload";
import { trpc } from "@/lib/trpc";
import { defaultProfile, type Profile } from "@shared/profile";
import { profileSchema } from "@shared/profileSchema";

const lines = (text: string) =>
  text
    .split("\n")
    .map(v => v.trim())
    .filter(Boolean);
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Group({
  title,
  children,
  onAdd,
}: {
  title: string;
  children: React.ReactNode;
  onAdd: () => void;
}) {
  return (
    <section className="admin-profile-group">
      <h2>{title}</h2>
      {children}
      <Button type="button" variant="outline" onClick={onAdd}>
        ＋ 追加
      </Button>
    </section>
  );
}
function Row({
  title,
  onRemove,
  children,
}: {
  title: string;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="admin-repeat">
      <header>
        <h3>{title}</h3>
        <Button type="button" variant="ghost" onClick={onRemove}>
          削除
        </Button>
      </header>
      {children}
    </div>
  );
}

export function ProfileEditor() {
  const utils = trpc.useUtils();
  const query = trpc.admin.content.profile.get.useQuery();
  const [p, setP] = useState<Profile>(defaultProfile);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (query.data && !loaded) {
      setP(query.data);
      setLoaded(true);
    }
  }, [query.data, loaded]);
  const save = trpc.admin.content.profile.update.useMutation({
    onSuccess: () => {
      utils.content.profile.get.invalidate();
      utils.admin.content.profile.get.invalidate();
    },
  });
  const patch = (values: Partial<Profile>) => {
    setP(current => ({ ...current, ...values }));
    save.reset();
    setError("");
  };
  const field = (
    key: "name" | "headline" | "introduction" | "about" | "githubUrl" | "xUrl",
    label: string,
    multiline = false
  ) => (
    <Field label={label}>
      {multiline ? (
        <Textarea
          rows={key === "about" ? 8 : 3}
          value={p[key]}
          onChange={e => patch({ [key]: e.target.value })}
        />
      ) : (
        <Input
          value={p[key]}
          onChange={e => patch({ [key]: e.target.value })}
        />
      )}
    </Field>
  );
  if (query.isLoading)
    return <p role="status">プロフィールを読み込んでいます。</p>;
  if (query.isError)
    return (
      <p role="alert">
        プロフィールを取得できませんでした。
        <Button onClick={() => query.refetch()}>再試行</Button>
      </p>
    );
  return (
    <form
      className="admin-editor admin-profile-form"
      onSubmit={e => {
        e.preventDefault();
        const parsed = profileSchema.safeParse({
          ...p,
          skills: lines(p.skills.join("\n")),
          personal: lines(p.personal.join("\n")),
          interests: p.interests.map(v => ({
            ...v,
            items: lines(v.items.join("\n")),
          })),
        });
        if (!parsed.success) {
          setError(
            parsed.error.issues
              .map(v => `${v.path.join(".")}: ${v.message}`)
              .join("\n")
          );
          return;
        }
        save.mutate(parsed.data);
      }}
    >
      <div>
        <p className="admin-panel-kicker">ABOUT ME</p>
        <h2>プロフィールを整える</h2>
        <p className="admin-form-help">
          変更後に「プロフィールを保存」を押すと公開ページに反映されます。リストは1行につき1項目です。
        </p>
      </div>
      {field("name", "名前 / 表示名")}
      {field("headline", "肩書き・キャッチコピー")}
      <AdminImageUpload
        scope="works"
        value={p.avatarUrl}
        onChange={avatarUrl => patch({ avatarUrl })}
      />
      {field("introduction", "短い自己紹介（Homeにも表示）", true)}
      {field("about", "詳しい自己紹介", true)}
      <div className="form-two">
        {field("githubUrl", "GitHub URL")}
        {field("xUrl", "X URL")}
      </div>
      <Field label="Skills（1行に1項目）">
        <Textarea
          value={p.skills.join("\n")}
          onChange={e => patch({ skills: e.target.value.split("\n") })}
        />
      </Field>
      <Field label="Personal / 特徴（1行に1項目）">
        <Textarea
          value={p.personal.join("\n")}
          onChange={e => patch({ personal: e.target.value.split("\n") })}
        />
      </Field>
      <Group
        title="Interests / 好きなもの"
        onAdd={() =>
          patch({ interests: [...p.interests, { category: "", items: [] }] })
        }
      >
        {p.interests.map((v, i) => (
          <Row
            key={i}
            title={`カテゴリ ${i + 1}`}
            onRemove={() =>
              patch({ interests: p.interests.filter((_, j) => j !== i) })
            }
          >
            <Field label="カテゴリ名">
              <Input
                value={v.category}
                onChange={e =>
                  patch({
                    interests: p.interests.map((r, j) =>
                      j === i ? { ...r, category: e.target.value } : r
                    ),
                  })
                }
              />
            </Field>
            <Field label="好きなもの（1行に1項目）">
              <Textarea
                value={v.items.join("\n")}
                onChange={e =>
                  patch({
                    interests: p.interests.map((r, j) =>
                      j === i ? { ...r, items: e.target.value.split("\n") } : r
                    ),
                  })
                }
              />
            </Field>
          </Row>
        ))}
      </Group>
      <Group
        title="PC Environment / パソコン環境"
        onAdd={() =>
          patch({
            devices: [
              ...p.devices,
              {
                name: "",
                imageUrl: "",
                os: "",
                cpu: "",
                memory: "",
                storage: "",
                software: "",
              },
            ],
          })
        }
      >
        {p.devices.map((v, i) => (
          <Row
            key={i}
            title={`デバイス ${i + 1}`}
            onRemove={() =>
              patch({ devices: p.devices.filter((_, j) => j !== i) })
            }
          >
            <AdminImageUpload
              scope="works"
              value={v.imageUrl}
              onChange={imageUrl =>
                patch({
                  devices: p.devices.map((r, j) =>
                    j === i ? { ...r, imageUrl } : r
                  ),
                })
              }
            />
            {(
              [
                ["name", "名前"],
                ["os", "OS"],
                ["cpu", "CPU"],
                ["memory", "メモリ"],
                ["storage", "ストレージ"],
                ["software", "ソフトウェア・開発環境"],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} label={label}>
                <Input
                  value={v[key]}
                  onChange={e =>
                    patch({
                      devices: p.devices.map((r, j) =>
                        j === i ? { ...r, [key]: e.target.value } : r
                      ),
                    })
                  }
                />
              </Field>
            ))}
          </Row>
        ))}
      </Group>
      <Group
        title="Music / 音楽"
        onAdd={() =>
          patch({
            music: [
              ...p.music,
              {
                title: "",
                artist: "",
                genre: "",
                artworkUrl: "",
                url: "",
                note: "",
              },
            ],
          })
        }
      >
        {p.music.map((v, i) => (
          <Row
            key={i}
            title={`音楽 ${i + 1}`}
            onRemove={() => patch({ music: p.music.filter((_, j) => j !== i) })}
          >
            <AdminImageUpload
              scope="works"
              value={v.artworkUrl}
              onChange={artworkUrl =>
                patch({
                  music: p.music.map((r, j) =>
                    j === i ? { ...r, artworkUrl } : r
                  ),
                })
              }
            />
            {(
              [
                ["title", "楽曲・ライブラリ名"],
                ["artist", "アーティスト"],
                ["genre", "ジャンル"],
                ["url", "外部リンク"],
                ["note", "音楽の趣味・活動・今聴いているもの"],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} label={label}>
                <Input
                  value={v[key]}
                  onChange={e =>
                    patch({
                      music: p.music.map((r, j) =>
                        j === i ? { ...r, [key]: e.target.value } : r
                      ),
                    })
                  }
                />
              </Field>
            ))}
          </Row>
        ))}
      </Group>
      <Group
        title="Activity / 活動履歴"
        onAdd={() =>
          patch({
            activities: [
              ...p.activities,
              {
                id: crypto.randomUUID(),
                date: new Date().toISOString().slice(0, 10),
                title: "",
                description: "",
                url: "",
              },
            ],
          })
        }
      >
        {p.activities.map((v, i) => (
          <Row
            key={v.id}
            title={`活動 ${i + 1}`}
            onRemove={() =>
              patch({ activities: p.activities.filter((_, j) => j !== i) })
            }
          >
            {(
              [
                ["date", "日付"],
                ["title", "イベント・活動名"],
                ["description", "何をしたか"],
                ["url", "関連URL（任意）"],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} label={label}>
                {key === "description" ? (
                  <Textarea
                    value={v[key]}
                    onChange={e =>
                      patch({
                        activities: p.activities.map((r, j) =>
                          j === i ? { ...r, [key]: e.target.value } : r
                        ),
                      })
                    }
                  />
                ) : (
                  <Input
                    type={key === "date" ? "date" : "text"}
                    value={v[key]}
                    onChange={e =>
                      patch({
                        activities: p.activities.map((r, j) =>
                          j === i ? { ...r, [key]: e.target.value } : r
                        ),
                      })
                    }
                  />
                )}
              </Field>
            ))}
          </Row>
        ))}
      </Group>
      <Group
        title="その他のリンク"
        onAdd={() => patch({ links: [...p.links, { label: "", url: "" }] })}
      >
        {p.links.map((v, i) => (
          <Row
            key={i}
            title={`リンク ${i + 1}`}
            onRemove={() => patch({ links: p.links.filter((_, j) => j !== i) })}
          >
            <Field label="表示名">
              <Input
                value={v.label}
                onChange={e =>
                  patch({
                    links: p.links.map((r, j) =>
                      j === i ? { ...r, label: e.target.value } : r
                    ),
                  })
                }
              />
            </Field>
            <Field label="URL">
              <Input
                value={v.url}
                onChange={e =>
                  patch({
                    links: p.links.map((r, j) =>
                      j === i ? { ...r, url: e.target.value } : r
                    ),
                  })
                }
              />
            </Field>
          </Row>
        ))}
      </Group>
      <Button type="submit" disabled={save.isPending || !loaded}>
        {save.isPending ? "保存しています…" : "プロフィールを保存"}
      </Button>
      {(error || save.error) && (
        <p className="admin-feedback" role="alert">
          {error || save.error?.message}
        </p>
      )}
      {save.isSuccess && (
        <p role="status" className="admin-save-success">
          プロフィールを保存しました。
        </p>
      )}
    </form>
  );
}
