import type {
    ShootPlan,
    ShootWeatherSummary,
  } from "@/lib/shootStorage";
  
  import { createClient } from "@/lib/supabase/client";
  
  type ShootPlanRow = {
    id: string;
    user_id: string;
    title: string;
    shoot_type: ShootPlan["shootType"];
    location: string;
    shoot_date: string;
    recommended_time: string;
    status: ShootPlan["status"];
    shot_list: string[];
    equipment: string[];
    completed_shots: string[];
    packed_equipment: string[];
    notes: string;
    weather: ShootWeatherSummary | null;
    created_at: string;
    updated_at: string;
  };
  
  function convertRowToShootPlan(
    row: ShootPlanRow,
  ): ShootPlan {
    return {
      id: row.id,
      title: row.title,
      shootType: row.shoot_type,
      location: row.location,
      date: row.shoot_date,
      recommendedTime:
        row.recommended_time,
      status: row.status,
      shotList: row.shot_list ?? [],
      equipment: row.equipment ?? [],
      completedShots:
        row.completed_shots ?? [],
      packedEquipment:
        row.packed_equipment ?? [],
      notes: row.notes ?? "",
      weather: row.weather ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
  
  function getEditableDatabaseValues(
    plan: ShootPlan,
  ) {
    return {
      title: plan.title,
      shoot_type: plan.shootType,
      location: plan.location,
      shoot_date: plan.date,
  
      recommended_time:
        plan.recommendedTime,
  
      status: plan.status,
  
      shot_list:
        plan.shotList ?? [],
  
      equipment:
        plan.equipment ?? [],
  
      completed_shots:
        plan.completedShots ?? [],
  
      packed_equipment:
        plan.packedEquipment ?? [],
  
      notes:
        plan.notes ?? "",
  
      weather:
        plan.weather ?? null,
    };
  }
  
  export async function loadShootPlansFromDatabase(): Promise<
    ShootPlan[]
  > {
    const supabase = createClient();
  
    const { data, error } = await supabase
      .from("shoot_plans")
      .select("*")
      .order("shoot_date", {
        ascending: true,
      })
      .order("created_at", {
        ascending: false,
      });
  
    if (error) {
      throw new Error(
        `Could not load shoot plans: ${error.message}`,
      );
    }
  
    return (
      (data ?? []) as ShootPlanRow[]
    ).map(convertRowToShootPlan);
  }
  
  export async function createShootPlanInDatabase(
    plan: ShootPlan,
  ): Promise<void> {
    const supabase = createClient();
  
    const { error } = await supabase
      .from("shoot_plans")
      .insert({
        id: plan.id,
  
        ...getEditableDatabaseValues(
          plan,
        ),
  
        created_at: plan.createdAt,
        updated_at: plan.updatedAt,
      });
  
    if (error) {
      throw new Error(
        `Could not create shoot plan: ${error.message}`,
      );
    }
  }
  
  export async function updateShootPlanInDatabase(
    plan: ShootPlan,
  ): Promise<void> {
    const supabase = createClient();
  
    const { error } = await supabase
      .from("shoot_plans")
      .update(
        getEditableDatabaseValues(plan),
      )
      .eq("id", plan.id);
  
    if (error) {
      throw new Error(
        `Could not update shoot plan: ${error.message}`,
      );
    }
  }
  
  export async function deleteShootPlanFromDatabase(
    shootId: string,
  ): Promise<void> {
    const supabase = createClient();
  
    const { error } = await supabase
      .from("shoot_plans")
      .delete()
      .eq("id", shootId);
  
    if (error) {
      throw new Error(
        `Could not delete shoot plan: ${error.message}`,
      );
    }
  }
  export async function migrateShootPlansToDatabase(
    plans: ShootPlan[],
  ): Promise<number> {
    if (plans.length === 0) {
      return 0;
    }
  
    const supabase = createClient();
  
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
  
    if (userError || !user) {
      throw new Error(
        "You must be logged in before migrating shoot plans.",
      );
    }
  
    const databaseRows = plans.map((plan) => ({
      id: plan.id,
      user_id: user.id,
  
      ...getEditableDatabaseValues(plan),
  
      created_at: plan.createdAt,
      updated_at: plan.updatedAt,
    }));
  
    const { error } = await supabase
      .from("shoot_plans")
      .upsert(databaseRows, {
        onConflict: "user_id,id",
      });
  
    if (error) {
      throw new Error(
        `Could not migrate shoot plans: ${error.message}`,
      );
    }
  
    return databaseRows.length;
  }