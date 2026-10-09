export type Device = {
  name: string;
  imageUrl: string;
  os: string;
  cpu: string;
  memory: string;
  storage: string;
  software: string;
};
export type MusicItem = {
  title: string;
  artist: string;
  genre: string;
  artworkUrl: string;
  url: string;
  note: string;
};
export type Interest = { category: string; items: string[] };
export type Activity = {
  id: string;
  date: string;
  title: string;
  description: string;
  url: string;
};
export type Profile = {
  introduction: string;
  name: string;
  headline: string;
  avatarUrl: string;
  about: string;
  githubUrl: string;
  xUrl: string;
  skills: string[];
  interests: Interest[];
  personal: string[];
  devices: Device[];
  music: MusicItem[];
  activities: Activity[];
  links: { label: string; url: string }[];
};
export const defaultProfile: Profile = {
  introduction: "つくったもの、写真、読んだもの、日々の記録をまとめています。",
  name: "月春",
  headline: "つくる、撮る、日々を残す。",
  avatarUrl: "",
  about: "",
  githubUrl: "",
  xUrl: "",
  skills: [],
  interests: [],
  personal: [],
  devices: [],
  music: [],
  activities: [],
  links: [],
};
