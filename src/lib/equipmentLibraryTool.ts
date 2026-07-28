import { tool } from "@openai/agents";
import { z } from "zod";

import {
  loadEquipmentItemsFromDatabase,
  type EquipmentItem,
} from "@/lib/equipmentDatabase";

function formatEquipmentLabel(
  item: EquipmentItem,
): string {
  const brandAndModel = [
    item.brand,
    item.model,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const name =
    brandAndModel &&
    brandAndModel.toLowerCase() !==
      item.name.trim().toLowerCase()
      ? `${item.name} — ${brandAndModel}`
      : item.name;

  return item.quantity > 1
    ? `${name} ×${item.quantity}`
    : name;
}

function convertEquipmentForAssistant(
  item: EquipmentItem,
) {
  return {
    label: formatEquipmentLabel(item),
    name: item.name,
    category: item.category,
    brand: item.brand,
    model: item.model,
    quantity: item.quantity,
    status: item.status,
    notes: item.notes,
  };
}

export function createEquipmentLibraryTool() {
  return tool({
    name: "get_equipment_library",

    description: `
      Read the currently logged-in user's saved equipment
      library.

      Use this tool before:
      - Recommending equipment the user should take
      - Creating a photography, videography or drone shoot plan
      - Answering questions about equipment the user owns
      - Deciding whether equipment must be rented or borrowed

      This tool is read-only. It does not add, edit or delete
      equipment.
    `,

    parameters: z.object({}),

    async execute() {
      try {
        const items =
          await loadEquipmentItemsFromDatabase();

        const available = items
          .filter(
            (item) =>
              item.status === "available",
          )
          .map(
            convertEquipmentForAssistant,
          );

        const maintenance = items
          .filter(
            (item) =>
              item.status === "maintenance",
          )
          .map(
            convertEquipmentForAssistant,
          );

        const unavailable = items
          .filter(
            (item) =>
              item.status === "unavailable",
          )
          .map(
            convertEquipmentForAssistant,
          );

        return JSON.stringify({
          success: true,
          totalItems: items.length,
          availableCount: available.length,
          maintenanceCount:
            maintenance.length,
          unavailableCount:
            unavailable.length,
          available,
          maintenance,
          unavailable,
          guidance: {
            available:
              "These items can be recommended as owned equipment.",
            maintenance:
              "Do not include these as usable equipment unless the user says they will be repaired.",
            unavailable:
              "Do not include these as usable equipment.",
            missingEquipment:
              'Prefix equipment the user does not own with "Rent/borrow: ".',
          },
        });
      } catch (error) {
        console.error(
          "Equipment library tool error:",
          error,
        );

        return JSON.stringify({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "The equipment library could not be loaded.",
        });
      }
    },
  });
}