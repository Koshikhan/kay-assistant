import { createClient } from "@/lib/supabase/client";

export type EquipmentCategory =
  | "camera"
  | "lens"
  | "drone"
  | "audio"
  | "lighting"
  | "support"
  | "battery"
  | "storage"
  | "accessory"
  | "other";

export type EquipmentStatus =
  | "available"
  | "unavailable"
  | "maintenance";

export type EquipmentItem = {
  id: string;
  name: string;
  category: EquipmentCategory;
  brand: string;
  model: string;
  quantity: number;
  status: EquipmentStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type NewEquipmentItem = {
  name: string;
  category: EquipmentCategory;
  brand: string;
  model: string;
  quantity: number;
  status: EquipmentStatus;
  notes: string;
};

type EquipmentItemRow = {
  id: string;
  user_id: string;
  name: string;
  category: EquipmentCategory;
  brand: string;
  model: string;
  quantity: number;
  status: EquipmentStatus;
  notes: string;
  created_at: string;
  updated_at: string;
};

function convertRowToEquipmentItem(
  row: EquipmentItemRow,
): EquipmentItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    brand: row.brand ?? "",
    model: row.model ?? "",
    quantity: row.quantity,
    status: row.status,
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getEditableDatabaseValues(
  item: NewEquipmentItem,
) {
  return {
    name: item.name.trim(),
    category: item.category,
    brand: item.brand.trim(),
    model: item.model.trim(),
    quantity: item.quantity,
    status: item.status,
    notes: item.notes.trim(),
  };
}

export async function loadEquipmentItemsFromDatabase():
  Promise<EquipmentItem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("equipment_items")
    .select("*")
    .order("category", {
      ascending: true,
    })
    .order("name", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Could not load equipment: ${error.message}`,
    );
  }

  return (
    (data ?? []) as EquipmentItemRow[]
  ).map(convertRowToEquipmentItem);
}

export async function createEquipmentItemInDatabase(
  item: NewEquipmentItem,
): Promise<EquipmentItem> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("equipment_items")
    .insert(
      getEditableDatabaseValues(item),
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Could not create equipment: ${error.message}`,
    );
  }

  return convertRowToEquipmentItem(
    data as EquipmentItemRow,
  );
}

export async function updateEquipmentItemInDatabase(
  item: EquipmentItem,
): Promise<EquipmentItem> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("equipment_items")
    .update(
      getEditableDatabaseValues(item),
    )
    .eq("id", item.id)
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Could not update equipment: ${error.message}`,
    );
  }

  return convertRowToEquipmentItem(
    data as EquipmentItemRow,
  );
}

export async function deleteEquipmentItemFromDatabase(
  equipmentId: string,
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("equipment_items")
    .delete()
    .eq("id", equipmentId);

  if (error) {
    throw new Error(
      `Could not delete equipment: ${error.message}`,
    );
  }
}