import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import React from "react"

type AvatarBadgeProps =
  | {
    className?: string
    icon?: never
  }
  | {
    className?: never
    icon: React.ReactNode
  }

interface AvatarCommonProps {
  id?: string,
  src: string,
  alt: string,
  className?: string,
  imageClassName?: string,
  size?: "sm" | "default" | "lg",
  fallback: string,
  hasBadge?: boolean,
  // className / icon only one of them should be provided
  badge?: AvatarBadgeProps,
}

type AvatarGroupCountProps =
  | {
    // count / icon only one of them should be provided
    count?: number,
    icon?: never,
  }
  | {
    // count / icon only one of them should be provided
    count?: never,
    icon: React.ReactNode,
  }

export interface Avatar4uProps {
  className?: string,
  singleAvatars?: AvatarCommonProps[],
  groupAvatars?: AvatarGroupCountProps & {
    className?: string,
    avatars: AvatarCommonProps[],
  }
}

export function Avatar4u(props: Avatar4uProps) {
  const getAvatarKey = (avatar: AvatarCommonProps) => avatar.id ?? `${avatar.src}-${avatar.alt}`

  return (
    <div className={props.className ?? "flex flex-row flex-wrap items-center gap-6 md:gap-12"}>
      {props.singleAvatars && props.singleAvatars.map((avatar) => {
        return (
          <Avatar
            key={getAvatarKey(avatar)}
            size={avatar.size ?? "default"}
            className={cn(avatar.hasBadge && "overflow-visible", avatar.className)}
          >
            <AvatarImage
              src={avatar.src}
              alt={avatar.alt}
              className={avatar.imageClassName}
            />
            <AvatarFallback>{avatar.fallback}</AvatarFallback>
            {avatar.hasBadge && <AvatarBadge className={avatar?.badge?.className ?? ""}>
              {avatar?.badge?.icon}
            </AvatarBadge>}
          </Avatar>
        );
      })}
      {props.groupAvatars && <AvatarGroup className={props.groupAvatars.className ?? "grayscale"}>
        {props.groupAvatars.avatars.map((avatar) => {
          return (
            <Avatar
              key={getAvatarKey(avatar)}
              size={avatar.size ?? "default"}
              className={cn(avatar.hasBadge && "overflow-visible", avatar.className)}
            >
              <AvatarImage
                src={avatar.src}
                alt={avatar.alt}
                className={avatar.imageClassName}
              />
              <AvatarFallback>{avatar.fallback}</AvatarFallback>
              {avatar.hasBadge && <AvatarBadge className={avatar?.badge?.className ?? "bg-green-600 dark:bg-green-800"}>
                {avatar?.badge?.icon}
              </AvatarBadge>}
            </Avatar>
          );
        })}
        {(props.groupAvatars.count || props.groupAvatars.icon) && <AvatarGroupCount>
          {props.groupAvatars.icon ? props.groupAvatars.icon : `+${props.groupAvatars.count}`}
        </AvatarGroupCount>}
      </AvatarGroup>}
    </div>
  )
}
