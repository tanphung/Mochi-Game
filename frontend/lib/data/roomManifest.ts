export interface RoomManifest {
  id: string;
  name: string;
  emoji: string;
  unlockLevel: number;
  image?: string;
  background: string; // CSS gradient, used when no image file exists
}

export const ROOM_MANIFEST: RoomManifest[] = [
  {
    id: "starter_room",
    name: "Starter Room",
    emoji: "Room",
    unlockLevel: 1,
    image: "/assets/mochi/rooms/1.png",
    background: "linear-gradient(145deg, #1a1a2e 0%, #16213e 55%, #0f3460 100%)",
  },
  {
    id: "cozy_room",
    name: "Cozy Room",
    emoji: "Room",
    unlockLevel: 1,
    image: "/assets/mochi/rooms/2.png",
    background: "linear-gradient(145deg, #2d1b33 0%, #4a1942 55%, #6b2d5e 100%)",
  },
  {
    id: "garden",
    name: "Garden",
    emoji: "Room",
    unlockLevel: 1,
    image: "/assets/mochi/rooms/3.png",
    background: "linear-gradient(145deg, #0d2b1a 0%, #1a5c35 55%, #2d8a52 100%)",
  },
  {
    id: "space",
    name: "Space",
    emoji: "Room",
    unlockLevel: 1,
    image: "/assets/mochi/rooms/4.png",
    background: "linear-gradient(145deg, #05050f 0%, #0c0c2a 55%, #1a1040 100%)",
  },
  {
    id: "fantasy",
    name: "Fantasy",
    emoji: "Room",
    unlockLevel: 1,
    image: "/assets/mochi/rooms/5.png",
    background: "linear-gradient(145deg, #2d0a0a 0%, #6b1f1f 40%, #9b3a1a 100%)",
  },
  {
    id: "legendary",
    name: "Legendary",
    emoji: "Room",
    unlockLevel: 1,
    image: "/assets/mochi/rooms/6.png",
    background: "linear-gradient(145deg, #1a0533 0%, #3d1066 55%, #6b20aa 100%)",
  },
  {
    id: "prism_room",
    name: "Prism Room",
    emoji: "Room",
    unlockLevel: 1,
    image: "/assets/mochi/rooms/7.png",
    background: "linear-gradient(145deg, #101743 0%, #23346f 55%, #462a7c 100%)",
  },
  {
    id: "dream_room",
    name: "Dream Room",
    emoji: "Room",
    unlockLevel: 1,
    image: "/assets/mochi/rooms/8.png",
    background: "linear-gradient(145deg, #160f38 0%, #35205f 55%, #5b2a86 100%)",
  },
];

export const DEFAULT_ROOM: RoomManifest = ROOM_MANIFEST[0];

export function getRoomById(id: string): RoomManifest {
  return ROOM_MANIFEST.find((r) => r.id === id) ?? DEFAULT_ROOM;
}
