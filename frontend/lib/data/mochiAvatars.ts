export interface MochiAvatar {
  id: string;
  name: string;
  src: string;
}

export const DEFAULT_MOCHI_AVATAR_ID = "mochi-1";

export const MOCHI_AVATARS: MochiAvatar[] = Array.from({ length: 8 }, (_, index) => {
  const number = index + 1;
  return {
    id: `mochi-${number}`,
    name: `Mochi ${number}`,
    src: `/assets/mochi/characters/${number}.png`,
  };
});

export function getMochiAvatar(id: string): MochiAvatar {
  return MOCHI_AVATARS.find((avatar) => avatar.id === id) ?? MOCHI_AVATARS[0];
}
