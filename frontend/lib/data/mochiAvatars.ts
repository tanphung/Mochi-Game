export interface MochiAvatar {
  id: string;
  name: string;
  src: string;
}

export const DEFAULT_MOCHI_AVATAR_ID = "mochi-1";

const AVAILABLE_MOCHI_AVATARS = [1, 2, 3, 4, 5, 7, 8];

export const MOCHI_AVATARS: MochiAvatar[] = AVAILABLE_MOCHI_AVATARS.map((number) => {
  return {
    id: `mochi-${number}`,
    name: `Mochi ${number}`,
    src: `/assets/mochi/characters/${number}.png`,
  };
});

export function getMochiAvatar(id: string): MochiAvatar {
  return MOCHI_AVATARS.find((avatar) => avatar.id === id) ?? MOCHI_AVATARS[0];
}
