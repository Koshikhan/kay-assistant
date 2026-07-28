"use client";

import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createEquipmentItemInDatabase,
  deleteEquipmentItemFromDatabase,
  loadEquipmentItemsFromDatabase,
  updateEquipmentItemInDatabase,
  type EquipmentCategory,
  type EquipmentItem,
  type EquipmentStatus,
  type NewEquipmentItem,
} from "@/lib/equipmentDatabase";

const CATEGORY_OPTIONS: {
  value: EquipmentCategory;
  label: string;
  icon: string;
}[] = [
  {
    value: "camera",
    label: "Camera",
    icon: "📷",
  },
  {
    value: "lens",
    label: "Lens",
    icon: "🔭",
  },
  {
    value: "drone",
    label: "Drone",
    icon: "🚁",
  },
  {
    value: "audio",
    label: "Audio",
    icon: "🎙️",
  },
  {
    value: "lighting",
    label: "Lighting",
    icon: "💡",
  },
  {
    value: "support",
    label: "Support",
    icon: "🎛️",
  },
  {
    value: "battery",
    label: "Battery",
    icon: "🔋",
  },
  {
    value: "storage",
    label: "Storage",
    icon: "💾",
  },
  {
    value: "accessory",
    label: "Accessory",
    icon: "🧰",
  },
  {
    value: "other",
    label: "Other",
    icon: "📦",
  },
];

const STATUS_OPTIONS: {
  value: EquipmentStatus;
  label: string;
}[] = [
  {
    value: "available",
    label: "Available",
  },
  {
    value: "unavailable",
    label: "Unavailable",
  },
  {
    value: "maintenance",
    label: "Maintenance",
  },
];

const EMPTY_FORM: NewEquipmentItem = {
  name: "",
  category: "camera",
  brand: "",
  model: "",
  quantity: 1,
  status: "available",
  notes: "",
};

function sortEquipmentItems(
  items: EquipmentItem[],
): EquipmentItem[] {
  return [...items].sort((first, second) => {
    const categoryComparison =
      first.category.localeCompare(
        second.category,
      );

    if (categoryComparison !== 0) {
      return categoryComparison;
    }

    return first.name.localeCompare(
      second.name,
    );
  });
}

function getCategoryDetails(
  category: EquipmentCategory,
) {
  return (
    CATEGORY_OPTIONS.find(
      (option) =>
        option.value === category,
    ) ?? CATEGORY_OPTIONS.at(-1)!
  );
}

function getStatusLabel(
  status: EquipmentStatus,
): string {
  return (
    STATUS_OPTIONS.find(
      (option) => option.value === status,
    )?.label ?? status
  );
}

function getStatusClasses(
  status: EquipmentStatus,
): string {
  if (status === "available") {
    return "border-green-900 bg-green-950/60 text-green-300";
  }

  if (status === "maintenance") {
    return "border-amber-900 bg-amber-950/60 text-amber-300";
  }

  return "border-red-900 bg-red-950/60 text-red-300";
}

export function EquipmentLibrary() {
  const [items, setItems] =
    useState<EquipmentItem[]>([]);

  const [isLoaded, setIsLoaded] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [isFormOpen, setIsFormOpen] =
    useState(false);

  const [editingItem, setEditingItem] =
    useState<EquipmentItem | null>(null);

  const [form, setForm] =
    useState<NewEquipmentItem>(EMPTY_FORM);

  const [isSaving, setIsSaving] =
    useState(false);

  const [
    deletingItemId,
    setDeletingItemId,
  ] = useState<string | null>(null);

  const [
    updatingStatusItemId,
    setUpdatingStatusItemId,
  ] = useState<string | null>(null);

  const [searchText, setSearchText] =
    useState("");

  const [
    categoryFilter,
    setCategoryFilter,
  ] = useState<
    EquipmentCategory | "all"
  >("all");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<
    EquipmentStatus | "all"
  >("all");

  useEffect(() => {
    let isActive = true;

    async function loadEquipment() {
      try {
        setErrorMessage("");

        const databaseItems =
          await loadEquipmentItemsFromDatabase();

        if (isActive) {
          setItems(
            sortEquipmentItems(
              databaseItems,
            ),
          );
        }
      } catch (error) {
        console.warn(
          "Equipment loading failed:",
          error,
        );

        if (isActive) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Equipment could not be loaded.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoaded(true);
        }
      }
    }

    void loadEquipment();

    return () => {
      isActive = false;
    };
  }, []);

  const filteredItems = useMemo(() => {
    const normalisedSearch =
      searchText.trim().toLowerCase();

    return items.filter((item) => {
      const matchesCategory =
        categoryFilter === "all" ||
        item.category === categoryFilter;

      const matchesStatus =
        statusFilter === "all" ||
        item.status === statusFilter;

      const searchableText = [
        item.name,
        item.brand,
        item.model,
        item.notes,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !normalisedSearch ||
        searchableText.includes(
          normalisedSearch,
        );

      return (
        matchesCategory &&
        matchesStatus &&
        matchesSearch
      );
    });
  }, [
    categoryFilter,
    items,
    searchText,
    statusFilter,
  ]);

  const availableCount = items.filter(
    (item) =>
      item.status === "available",
  ).length;

  const maintenanceCount = items.filter(
    (item) =>
      item.status === "maintenance",
  ).length;

  function openCreateForm() {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setErrorMessage("");
    setIsFormOpen(true);
  }

  function openEditForm(
    item: EquipmentItem,
  ) {
    setEditingItem(item);

    setForm({
      name: item.name,
      category: item.category,
      brand: item.brand,
      model: item.model,
      quantity: item.quantity,
      status: item.status,
      notes: item.notes,
    });

    setErrorMessage("");
    setIsFormOpen(true);
  }

  function closeForm() {
    if (isSaving) {
      return;
    }

    setEditingItem(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(false);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const equipmentName =
      form.name.trim();

    if (!equipmentName) {
      setErrorMessage(
        "Enter a name for this equipment.",
      );

      return;
    }

    if (
      !Number.isInteger(form.quantity) ||
      form.quantity < 1
    ) {
      setErrorMessage(
        "Quantity must be at least 1.",
      );

      return;
    }

    const values: NewEquipmentItem = {
      ...form,
      name: equipmentName,
    };

    try {
      setIsSaving(true);
      setErrorMessage("");

      if (editingItem) {
        const updatedItem =
          await updateEquipmentItemInDatabase({
            ...editingItem,
            ...values,
          });

        setItems((currentItems) =>
          sortEquipmentItems(
            currentItems.map((item) =>
              item.id === updatedItem.id
                ? updatedItem
                : item,
            ),
          ),
        );
      } else {
        const createdItem =
          await createEquipmentItemInDatabase(
            values,
          );

        setItems((currentItems) =>
          sortEquipmentItems([
            ...currentItems,
            createdItem,
          ]),
        );
      }

      setEditingItem(null);
      setForm(EMPTY_FORM);
      setIsFormOpen(false);
    } catch (error) {
      console.warn(
        "Equipment saving failed:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Equipment could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange(
    item: EquipmentItem,
    status: EquipmentStatus,
  ) {
    if (item.status === status) {
      return;
    }

    try {
      setUpdatingStatusItemId(item.id);
      setErrorMessage("");

      const updatedItem =
        await updateEquipmentItemInDatabase({
          ...item,
          status,
        });

      setItems((currentItems) =>
        sortEquipmentItems(
          currentItems.map(
            (currentItem) =>
              currentItem.id ===
              updatedItem.id
                ? updatedItem
                : currentItem,
          ),
        ),
      );
    } catch (error) {
      console.warn(
        "Equipment status update failed:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Equipment status could not be updated.",
      );
    } finally {
      setUpdatingStatusItemId(null);
    }
  }

  async function handleDelete(
    item: EquipmentItem,
  ) {
    const shouldDelete =
      window.confirm(
        `Delete "${item.name}" from your equipment library?`,
      );

    if (!shouldDelete) {
      return;
    }

    try {
      setDeletingItemId(item.id);
      setErrorMessage("");

      await deleteEquipmentItemFromDatabase(
        item.id,
      );

      setItems((currentItems) =>
        currentItems.filter(
          (currentItem) =>
            currentItem.id !== item.id,
        ),
      );
    } catch (error) {
      console.warn(
        "Equipment deletion failed:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Equipment could not be deleted.",
      );
    } finally {
      setDeletingItemId(null);
    }
  }

  return (
    <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl lg:col-span-2">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-neutral-500">
            Your gear
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            Equipment Library
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
            Save the cameras, lenses,
            drones and accessories you
            own. Later, Kay will use this
            library when building shoot
            plans.
          </p>
        </div>

        <button
          type="button"
          onClick={
            isFormOpen
              ? closeForm
              : openCreateForm
          }
          disabled={isSaving}
          className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isFormOpen
            ? "Close form"
            : "Add equipment"}
        </button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4">
          <p className="text-sm text-neutral-500">
            Total items
          </p>

          <p className="mt-1 text-2xl font-bold">
            {items.length}
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4">
          <p className="text-sm text-neutral-500">
            Available
          </p>

          <p className="mt-1 text-2xl font-bold text-green-300">
            {availableCount}
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4">
          <p className="text-sm text-neutral-500">
            Maintenance
          </p>

          <p className="mt-1 text-2xl font-bold text-amber-300">
            {maintenanceCount}
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="mt-5 rounded-xl border border-red-900 bg-red-950/50 p-4 text-sm text-red-200">
          {errorMessage}
        </div>
      )}

      {isFormOpen && (
        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-2xl border border-neutral-700 bg-neutral-950/60 p-5"
        >
          <div>
            <h3 className="text-lg font-semibold">
              {editingItem
                ? "Edit equipment"
                : "Add equipment"}
            </h3>

            <p className="mt-1 text-sm text-neutral-500">
              Name is required. The other
              details help Kay make better
              equipment recommendations.
            </p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-neutral-300">
                Equipment name
              </span>

              <input
                type="text"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Main camera"
                className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-white outline-none transition placeholder:text-neutral-600 focus:border-neutral-500"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-neutral-300">
                Category
              </span>

              <select
                value={form.category}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    category:
                      event.target
                        .value as EquipmentCategory,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
              >
                {CATEGORY_OPTIONS.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.icon}{" "}
                      {option.label}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-neutral-300">
                Brand
              </span>

              <input
                type="text"
                value={form.brand}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    brand:
                      event.target.value,
                  }))
                }
                placeholder="Canon"
                className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-white outline-none transition placeholder:text-neutral-600 focus:border-neutral-500"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-neutral-300">
                Model
              </span>

              <input
                type="text"
                value={form.model}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    model:
                      event.target.value,
                  }))
                }
                placeholder="EOS 2000D"
                className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-white outline-none transition placeholder:text-neutral-600 focus:border-neutral-500"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-neutral-300">
                Quantity
              </span>

              <input
                type="number"
                min="1"
                step="1"
                value={form.quantity}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    quantity: Number(
                      event.target.value,
                    ),
                  }))
                }
                className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-neutral-300">
                Status
              </span>

              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status:
                      event.target
                        .value as EquipmentStatus,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
              >
                {STATUS_OPTIONS.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-neutral-300">
                Notes
              </span>

              <textarea
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    notes:
                      event.target.value,
                  }))
                }
                rows={3}
                placeholder="Battery condition, serial reference, preferred use..."
                className="mt-2 w-full resize-y rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-white outline-none transition placeholder:text-neutral-600 focus:border-neutral-500"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeForm}
              disabled={isSaving}
              className="rounded-xl border border-neutral-700 px-5 py-3 text-sm font-semibold text-neutral-300 transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving
                ? "Saving..."
                : editingItem
                  ? "Save changes"
                  : "Add to library"}
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 grid gap-3 md:grid-cols-[1fr_190px_190px]">
        <input
          type="search"
          value={searchText}
          onChange={(event) =>
            setSearchText(
              event.target.value,
            )
          }
          placeholder="Search equipment..."
          className="rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition placeholder:text-neutral-600 focus:border-neutral-500"
        />

        <select
          value={categoryFilter}
          onChange={(event) =>
            setCategoryFilter(
              event.target
                .value as EquipmentCategory | "all",
            )
          }
          className="rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
        >
          <option value="all">
            All categories
          </option>

          {CATEGORY_OPTIONS.map(
            (option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ),
          )}
        </select>

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(
              event.target
                .value as EquipmentStatus | "all",
            )
          }
          className="rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
        >
          <option value="all">
            All statuses
          </option>

          {STATUS_OPTIONS.map(
            (option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ),
          )}
        </select>
      </div>

      {!isLoaded ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[1, 2].map((item) => (
            <div
              key={item}
              className="h-52 animate-pulse rounded-2xl border border-neutral-800 bg-neutral-950/60"
            />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-neutral-700 bg-neutral-950/40 px-6 py-12 text-center">
          <p className="text-lg font-semibold text-neutral-300">
            {items.length === 0
              ? "Your equipment library is empty"
              : "No equipment matches these filters"}
          </p>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-neutral-500">
            {items.length === 0
              ? "Add your first camera, lens, drone or accessory. It will be saved securely to your Supabase account."
              : "Try changing the search text, category or status filter."}
          </p>

          {items.length === 0 && (
            <button
              type="button"
              onClick={openCreateForm}
              className="mt-5 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200"
            >
              Add first equipment
            </button>
          )}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {filteredItems.map((item) => {
            const category =
              getCategoryDetails(
                item.category,
              );

            const isDeleting =
              deletingItemId === item.id;

            const isUpdatingStatus =
              updatingStatusItemId ===
              item.id;

            return (
              <article
                key={item.id}
                className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-800 text-xl">
                      {category.icon}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">
                        {item.name}
                      </p>

                      <p className="mt-1 text-sm text-neutral-500">
                        {category.label}
                        {item.quantity > 1
                          ? ` · Quantity ${item.quantity}`
                          : ""}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                      item.status,
                    )}`}
                  >
                    {getStatusLabel(
                      item.status,
                    )}
                  </span>
                </div>

                {(item.brand ||
                  item.model) && (
                  <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900/80 p-3">
                    <p className="text-xs uppercase tracking-wide text-neutral-600">
                      Brand and model
                    </p>

                    <p className="mt-1 text-sm text-neutral-300">
                      {[item.brand, item.model]
                        .filter(Boolean)
                        .join(" ")}
                    </p>
                  </div>
                )}

                {item.notes && (
                  <p className="mt-4 text-sm leading-6 text-neutral-400">
                    {item.notes}
                  </p>
                )}

                <label className="mt-5 block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                    Quick status
                  </span>

                  <select
                    value={item.status}
                    disabled={
                      isUpdatingStatus ||
                      isDeleting
                    }
                    onChange={(event) =>
                      void handleStatusChange(
                        item,
                        event.target
                          .value as EquipmentStatus,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {STATUS_OPTIONS.map(
                      (option) => (
                        <option
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      openEditForm(item)
                    }
                    disabled={
                      isDeleting ||
                      isUpdatingStatus
                    }
                    className="flex-1 rounded-xl border border-neutral-700 px-4 py-2.5 text-sm font-semibold text-neutral-300 transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void handleDelete(item)
                    }
                    disabled={
                      isDeleting ||
                      isUpdatingStatus
                    }
                    className="flex-1 rounded-xl border border-red-900 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isDeleting
                      ? "Deleting..."
                      : "Delete"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}