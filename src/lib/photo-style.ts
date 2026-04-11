import type { Profile } from "@/types/resume";

export function getPhotoTransformStyle(profile: Pick<Profile, "photoPositionX" | "photoPositionY" | "photoScale">) {
  const translateX = (profile.photoPositionX - 50) * 0.75;
  const translateY = (profile.photoPositionY - 50) * 0.75;

  return {
    transform: `translate3d(${translateX}%, ${translateY}%, 0) scale(${profile.photoScale})`,
    transformOrigin: "center center",
  } as const;
}
