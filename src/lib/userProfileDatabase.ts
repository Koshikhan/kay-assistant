import { createClient } from "@/lib/supabase/client";

export type ExperienceLevel =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "professional";

export type DefaultShootType =
  | "photography"
  | "videography"
  | "drone"
  | "mixed";

export type PreferredShootTime =
  | "any"
  | "morning"
  | "golden-hour"
  | "evening"
  | "night";

export type UserProfile = {
  userId: string;
  displayName: string;
  experienceLevel: ExperienceLevel;
  defaultShootType: DefaultShootType;
  preferredStyles: string[];
  homeLocation: string;
  preferredShootTime: PreferredShootTime;
  planningNotes: string;
  createdAt: string;
  updatedAt: string;
};

export type UserProfileInput = {
  displayName: string;
  experienceLevel: ExperienceLevel;
  defaultShootType: DefaultShootType;
  preferredStyles: string[];
  homeLocation: string;
  preferredShootTime: PreferredShootTime;
  planningNotes: string;
};

type UserProfileRow = {
  user_id: string;
  display_name: string;
  experience_level: ExperienceLevel;
  default_shoot_type: DefaultShootType;
  preferred_styles: string[];
  home_location: string;
  preferred_shoot_time: PreferredShootTime;
  planning_notes: string;
  created_at: string;
  updated_at: string;
};

function convertRowToUserProfile(
  row: UserProfileRow,
): UserProfile {
  return {
    userId: row.user_id,
    displayName: row.display_name ?? "",
    experienceLevel:
      row.experience_level,
    defaultShootType:
      row.default_shoot_type,
    preferredStyles:
      row.preferred_styles ?? [],
    homeLocation:
      row.home_location ?? "",
    preferredShootTime:
      row.preferred_shoot_time,
    planningNotes:
      row.planning_notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function cleanStyles(
  styles: string[],
): string[] {
  const uniqueStyles = new Map<
    string,
    string
  >();

  for (const style of styles) {
    const trimmedStyle = style.trim();

    if (!trimmedStyle) {
      continue;
    }

    uniqueStyles.set(
      trimmedStyle.toLowerCase(),
      trimmedStyle,
    );
  }

  return Array.from(
    uniqueStyles.values(),
  ).slice(0, 20);
}

function convertInputToRow(
  input: UserProfileInput,
) {
  return {
    display_name:
      input.displayName.trim(),
    experience_level:
      input.experienceLevel,
    default_shoot_type:
      input.defaultShootType,
    preferred_styles:
      cleanStyles(
        input.preferredStyles,
      ),
    home_location:
      input.homeLocation.trim(),
    preferred_shoot_time:
      input.preferredShootTime,
    planning_notes:
      input.planningNotes.trim(),
  };
}

export async function loadUserProfileFromDatabase():
  Promise<UserProfile | null> {
  const supabase = createClient();

  const {
    data: userData,
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error(
      userError?.message ??
        "You must be logged in to load your profile.",
    );
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq(
      "user_id",
      userData.user.id,
    )
    .maybeSingle();

  if (error) {
    throw new Error(
      `Could not load your profile: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  return convertRowToUserProfile(
    data as UserProfileRow,
  );
}

export async function saveUserProfileToDatabase(
  input: UserProfileInput,
): Promise<UserProfile> {
  const supabase = createClient();

  const {
    data: userData,
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error(
      userError?.message ??
        "You must be logged in to save your profile.",
    );
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .upsert(
      {
        user_id: userData.user.id,
        ...convertInputToRow(input),
      },
      {
        onConflict: "user_id",
      },
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Could not save your profile: ${error.message}`,
    );
  }

  return convertRowToUserProfile(
    data as UserProfileRow,
  );
}
