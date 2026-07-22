"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Edit2,
  ChevronDown,
  ChevronUp,
  Gift,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/lib/supabase";
import type {
  GiftPerson,
  GiftProduct,
  GiftProductAssignment,
  GiftProductVariant,
} from "@/lib/types";

const STATUSES = ["idea", "planned", "ordered", "wrapped", "given"] as const;

function shortDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
  });
}

export default function GiftsPage() {
  const [people, setPeople] = useState<GiftPerson[]>([]);
  const [products, setProducts] = useState<GiftProduct[]>([]);
  const [variants, setVariants] = useState<GiftProductVariant[]>([]);
  const [assignments, setAssignments] = useState<GiftProductAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [personFilter, setPersonFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUSES)[number] | "all">("all");
  const [productFilter, setProductFilter] = useState("all");
  const [peopleCollapsed, setPeopleCollapsed] = useState(true);

  const [personName, setPersonName] = useState("");
  const [personEmail, setPersonEmail] = useState("");
  const [personRelation, setPersonRelation] = useState("");
  const [personNotes, setPersonNotes] = useState("");
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);

  const [productName, setProductName] = useState("");
  const [productCategory, setProductCategory] = useState("general");
  const [productType, setProductType] = useState("");
  const [productBrand, setProductBrand] = useState("");
  const [productStore, setProductStore] = useState("");
  const [productLink, setProductLink] = useState("");
  const [productNotes, setProductNotes] = useState("");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const [variantProductId, setVariantProductId] = useState("");
  const [variantName, setVariantName] = useState("");
  const [variantCode, setVariantCode] = useState("");
  const [variantColor, setVariantColor] = useState("");
  const [variantSize, setVariantSize] = useState("");
  const [variantPrice, setVariantPrice] = useState("");
  const [variantNotes, setVariantNotes] = useState("");

  const [assignmentProductId, setAssignmentProductId] = useState("");
  const [assignmentVariantId, setAssignmentVariantId] = useState("");
  const [assignmentPersonIds, setAssignmentPersonIds] = useState<string[]>([]);
  const [assignmentStatus, setAssignmentStatus] =
    useState<(typeof STATUSES)[number]>("idea");
  const [assignmentQuantity, setAssignmentQuantity] = useState("1");
  const [assignmentNote, setAssignmentNote] = useState("");

  async function load() {
    const [peopleRes, productsRes, variantsRes, assignmentsRes] = await Promise.all([
      supabase.from("gift_people").select("*").order("created_at", { ascending: false }),
      supabase.from("gift_products").select("*").order("created_at", { ascending: false }),
      supabase.from("gift_product_variants").select("*").order("created_at", { ascending: false }),
      supabase
        .from("gift_product_assignments")
        .select("*, person:gift_people(*), product:gift_products(*), variant:gift_product_variants(*)")
        .order("created_at", { ascending: false }),
    ]);

    if (peopleRes.error) console.warn(peopleRes.error);
    if (productsRes.error) console.warn(productsRes.error);
    if (variantsRes.error) console.warn(variantsRes.error);
    if (assignmentsRes.error) console.warn(assignmentsRes.error);

    setPeople((peopleRes.data as GiftPerson[] | null) ?? []);
    setProducts((productsRes.data as GiftProduct[] | null) ?? []);
    setVariants((variantsRes.data as GiftProductVariant[] | null) ?? []);
    setAssignments((assignmentsRes.data as GiftProductAssignment[] | null) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const peopleById = useMemo(
    () => new Map(people.map((person) => [person.id, person])),
    [people]
  );

  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );

  const variantsByProductId = useMemo(() => {
    const map = new Map<string, GiftProductVariant[]>();
    for (const variant of variants) {
      const list = map.get(variant.product_id) ?? [];
      list.push(variant);
      map.set(variant.product_id, list);
    }
    return map;
  }, [variants]);

  const assignmentsByProductId = useMemo(() => {
    const map = new Map<string, GiftProductAssignment[]>();
    for (const assignment of assignments) {
      const list = map.get(assignment.product_id) ?? [];
      list.push(assignment);
      map.set(assignment.product_id, list);
    }
    return map;
  }, [assignments]);

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    return products.filter((product) => {
      const productAssignments = assignmentsByProductId.get(product.id) ?? [];
      const hasPersonMatch =
        personFilter === "all" ||
        productAssignments.some((assignment) => assignment.person_id === personFilter);
      const matchesProduct =
        productFilter === "all" || product.id === productFilter;
      if (!hasPersonMatch || !matchesProduct) return false;
      if (!term) return true;

      const fields = [
        product.name,
        product.category,
        product.product_type,
        product.brand,
        product.store,
        product.notes,
        product.link,
        ...(variantsByProductId.get(product.id) ?? []).flatMap((variant) => [
          variant.name,
          variant.variant_code,
          variant.color,
          variant.size,
          variant.notes,
        ]),
        ...productAssignments.flatMap((assignment) => [
          peopleById.get(assignment.person_id)?.name,
          assignment.note,
          assignment.status,
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return fields.includes(term);
    });
  }, [assignmentsByProductId, personFilter, peopleById, productFilter, products, query, variantsByProductId]);

  const filteredAssignments = useMemo(() => {
    const term = query.trim().toLowerCase();
    return assignments.filter((assignment) => {
      const matchesPerson =
        personFilter === "all" || assignment.person_id === personFilter;
      const matchesStatus =
        statusFilter === "all" || assignment.status === statusFilter;
      const matchesProduct =
        productFilter === "all" || assignment.product_id === productFilter;
      if (!matchesPerson || !matchesStatus || !matchesProduct) return false;
      if (!term) return true;

      const person = assignment.person ?? peopleById.get(assignment.person_id) ?? null;
      const product = assignment.product ?? productsById.get(assignment.product_id) ?? null;
      const variant = assignment.variant ?? (assignment.variant_id ? variants.find((item) => item.id === assignment.variant_id) ?? null : null);
      const fields = [
        person?.name,
        person?.relation,
        product?.name,
        product?.category,
        product?.product_type,
        product?.brand,
        product?.store,
        variant?.name,
        variant?.variant_code,
        variant?.color,
        variant?.size,
        assignment.status,
        assignment.note,
        assignment.quantity.toString(),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return fields.includes(term);
    });
  }, [assignments, peopleById, productFilter, productsById, query, statusFilter, variants]);

  const totals = useMemo(() => {
    return {
      people: people.length,
      products: products.length,
      variants: variants.length,
      assignments: assignments.length,
    };
  }, [assignments.length, people.length, products.length, variants.length]);

  function resetPersonForm() {
    setPersonName("");
    setPersonEmail("");
    setPersonRelation("");
    setPersonNotes("");
    setEditingPersonId(null);
  }

  function resetProductForm() {
    setProductName("");
    setProductCategory("general");
    setProductType("");
    setProductBrand("");
    setProductStore("");
    setProductLink("");
    setProductNotes("");
    setEditingProductId(null);
  }

  function resetVariantForm() {
    setVariantProductId("");
    setVariantName("");
    setVariantCode("");
    setVariantColor("");
    setVariantSize("");
    setVariantPrice("");
    setVariantNotes("");
  }

  function resetAssignmentForm() {
    setAssignmentProductId("");
    setAssignmentVariantId("");
    setAssignmentPersonIds([]);
    setAssignmentStatus("idea");
    setAssignmentQuantity("1");
    setAssignmentNote("");
  }

  async function refresh() {
    const [peopleRes, productsRes, variantsRes, assignmentsRes] = await Promise.all([
      supabase.from("gift_people").select("*").order("created_at", { ascending: false }),
      supabase.from("gift_products").select("*").order("created_at", { ascending: false }),
      supabase.from("gift_product_variants").select("*").order("created_at", { ascending: false }),
      supabase
        .from("gift_product_assignments")
        .select("*, person:gift_people(*), product:gift_products(*), variant:gift_product_variants(*)")
        .order("created_at", { ascending: false }),
    ]);

    if (peopleRes.data) setPeople(peopleRes.data as GiftPerson[]);
    if (productsRes.data) setProducts(productsRes.data as GiftProduct[]);
    if (variantsRes.data) setVariants(variantsRes.data as GiftProductVariant[]);
    if (assignmentsRes.data) setAssignments(assignmentsRes.data as GiftProductAssignment[]);
  }

  async function saveProduct() {
    if (!productName.trim()) return;
    const payload = {
      name: productName.trim(),
      category: productCategory.trim() || "general",
      product_type: productType.trim() || null,
      brand: productBrand.trim() || null,
      store: productStore.trim() || null,
      link: productLink.trim() || null,
      notes: productNotes.trim() || null,
    };

    const request = editingProductId
      ? supabase.from("gift_products").update(payload).eq("id", editingProductId)
      : supabase.from("gift_products").insert(payload);

    const { error } = await request;
    if (error) {
      console.warn(error);
      return;
    }

    resetProductForm();
    await refresh();
  }

  async function saveVariant() {
    if (!variantProductId || !variantName.trim()) return;
    const price = variantPrice.trim() ? Number(variantPrice) : null;
    const { error } = await supabase.from("gift_product_variants").insert({
      product_id: variantProductId,
      name: variantName.trim(),
      variant_code: variantCode.trim() || null,
      color: variantColor.trim() || null,
      size: variantSize.trim() || null,
      price: Number.isFinite(price as number) ? price : null,
      notes: variantNotes.trim() || null,
    });
    if (error) {
      console.warn(error);
      return;
    }
    resetVariantForm();
    await refresh();
  }

  async function assignProduct() {
    const quantity = Number(assignmentQuantity);
    if (!assignmentProductId || assignmentPersonIds.length === 0 || !Number.isFinite(quantity) || quantity <= 0) return;

    const { error } = await supabase.from("gift_product_assignments").insert(
      assignmentPersonIds.map((personId) => ({
        product_id: assignmentProductId,
        variant_id: assignmentVariantId || null,
        person_id: personId,
        quantity,
        status: assignmentStatus,
        note: assignmentNote.trim() || null,
      }))
    );
    if (error) {
      console.warn(error);
      return;
    }
    resetAssignmentForm();
    await refresh();
  }

  async function deleteProduct(id: string) {
    const { error } = await supabase.from("gift_products").delete().eq("id", id);
    if (error) {
      console.warn(error);
      return;
    }
    await refresh();
  }

  async function deleteVariant(id: string) {
    const { error } = await supabase.from("gift_product_variants").delete().eq("id", id);
    if (error) {
      console.warn(error);
      return;
    }
    await refresh();
  }

  async function deleteAssignment(id: string) {
    const { error } = await supabase.from("gift_product_assignments").delete().eq("id", id);
    if (error) {
      console.warn(error);
      return;
    }
    await refresh();
  }

  async function savePerson() {
    if (!personName.trim()) return;

    const payload = {
      name: personName.trim(),
      relation: personRelation.trim() || null,
      email: personEmail.trim() || null,
      notes: personNotes.trim() || null,
    };

    const request = editingPersonId
      ? supabase.from("gift_people").update(payload).eq("id", editingPersonId)
      : supabase.from("gift_people").insert(payload);

    const { error } = await request;
    if (error) {
      console.warn(error);
      return;
    }

    resetPersonForm();
    await refresh();
  }

  async function deletePerson(id: string) {
    const { error } = await supabase.from("gift_people").delete().eq("id", id);
    if (error) {
      console.warn(error);
      return;
    }
    await refresh();
  }

  function startEditPerson(person: GiftPerson) {
    setEditingPersonId(person.id);
    setPersonName(person.name);
    setPersonEmail(person.email ?? "");
    setPersonRelation(person.relation ?? "");
    setPersonNotes(person.notes ?? "");
  }

  return (
    <main className="screen">
      <header className="pt-6 pb-3">
        <div className="flex items-center gap-3">
          <span className="h-11 w-11 rounded-full bg-clay/15 text-clay flex items-center justify-center">
            <Gift size={20} />
          </span>
          <div>
            <h1 className="font-display text-2xl">Gift list</h1>
            <p className="text-wheat/45 text-sm mt-1">
              Save products once, then assign them to people with variants, colors, and quantities.
            </p>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-3xl border border-wheat/10 bg-wheat/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-wheat/40">
            People
          </p>
          <p className="mt-2 font-display text-3xl">{totals.people}</p>
        </div>
        <div className="rounded-3xl border border-wheat/10 bg-wheat/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-wheat/40">
            Products
          </p>
          <p className="mt-2 font-display text-3xl">{totals.products}</p>
        </div>
        <div className="rounded-3xl border border-wheat/10 bg-wheat/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-wheat/40">
            Variants
          </p>
          <p className="mt-2 font-display text-3xl">{totals.variants}</p>
        </div>
        <div className="rounded-3xl border border-wheat/10 bg-wheat/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-wheat/40">
            Assignments
          </p>
          <p className="mt-2 font-display text-3xl">{totals.assignments}</p>
        </div>
      </section>

      <section className="rounded-[28px] border border-wheat/10 bg-[#171a13] p-4 mb-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <p className="font-medium">Product catalog</p>
            <p className="text-xs text-wheat/45 mt-1">
              Save a product once, then reuse it across any people.
            </p>
          </div>
          <button
            onClick={resetProductForm}
            className="h-9 rounded-full border border-wheat/15 px-3 text-xs text-wheat/60"
          >
            New
          </button>
        </div>

        <div className="mb-4 rounded-3xl border border-wheat/10 bg-wheat/5 p-4 grid gap-3">
          <label className="grid gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.24em] text-wheat/40">
              Product filter
            </span>
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="w-full bg-transparent border border-wheat/15 rounded-2xl px-4 py-3 text-sm outline-none focus:border-clay"
            >
              <option value="all">All products</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3">
          <input
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Product name"
            className="w-full bg-transparent border border-wheat/15 rounded-2xl px-4 py-3 text-sm outline-none focus:border-clay"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              value={productCategory}
              onChange={(e) => setProductCategory(e.target.value)}
              placeholder="Category"
              className="w-full bg-transparent border border-wheat/15 rounded-2xl px-4 py-3 text-sm outline-none focus:border-clay"
            />
            <input
              value={productType}
              onChange={(e) => setProductType(e.target.value)}
              placeholder="Type, like pen or snack"
              className="w-full bg-transparent border border-wheat/15 rounded-2xl px-4 py-3 text-sm outline-none focus:border-clay"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              value={productBrand}
              onChange={(e) => setProductBrand(e.target.value)}
              placeholder="Brand"
              className="w-full bg-transparent border border-wheat/15 rounded-2xl px-4 py-3 text-sm outline-none focus:border-clay"
            />
            <input
              value={productStore}
              onChange={(e) => setProductStore(e.target.value)}
              placeholder="Store"
              className="w-full bg-transparent border border-wheat/15 rounded-2xl px-4 py-3 text-sm outline-none focus:border-clay"
            />
          </div>
          <input
            value={productLink}
            onChange={(e) => setProductLink(e.target.value)}
            placeholder="Link"
            className="w-full bg-transparent border border-wheat/15 rounded-2xl px-4 py-3 text-sm outline-none focus:border-clay"
          />
          <textarea
            value={productNotes}
            onChange={(e) => setProductNotes(e.target.value)}
            placeholder="Notes"
            rows={2}
            className="w-full bg-transparent border border-wheat/15 rounded-2xl px-4 py-3 text-sm outline-none focus:border-clay resize-none"
          />
          <button
            onClick={saveProduct}
            className="rounded-2xl bg-clay text-ink px-4 py-3 text-sm font-medium flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            {editingProductId ? "Save product" : "Add product"}
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          <div className="rounded-3xl border border-wheat/10 bg-wheat/5 p-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-wheat/40">
              Variant
            </p>
            <div className="grid gap-3 mt-3">
              <select
                value={variantProductId}
                onChange={(e) => {
                  setVariantProductId(e.target.value);
                  setAssignmentProductId((current) => current || e.target.value);
                }}
                className="w-full bg-transparent border border-wheat/15 rounded-2xl px-4 py-3 text-sm outline-none focus:border-clay"
              >
                <option value="">Select product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={variantName}
                  onChange={(e) => setVariantName(e.target.value)}
                  placeholder="Variant name"
                  className="w-full bg-transparent border border-wheat/15 rounded-2xl px-4 py-3 text-sm outline-none focus:border-clay"
                />
                <input
                  value={variantCode}
                  onChange={(e) => setVariantCode(e.target.value)}
                  placeholder="Variant code"
                  className="w-full bg-transparent border border-wheat/15 rounded-2xl px-4 py-3 text-sm outline-none focus:border-clay"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={variantColor}
                  onChange={(e) => setVariantColor(e.target.value)}
                  placeholder="Color"
                  className="w-full bg-transparent border border-wheat/15 rounded-2xl px-4 py-3 text-sm outline-none focus:border-clay"
                />
                <input
                  value={variantSize}
                  onChange={(e) => setVariantSize(e.target.value)}
                  placeholder="Size"
                  className="w-full bg-transparent border border-wheat/15 rounded-2xl px-4 py-3 text-sm outline-none focus:border-clay"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={variantPrice}
                  onChange={(e) => setVariantPrice(e.target.value)}
                  placeholder="Price"
                  inputMode="decimal"
                  className="w-full bg-transparent border border-wheat/15 rounded-2xl px-4 py-3 text-sm outline-none focus:border-clay"
                />
                <input
                  value={variantNotes}
                  onChange={(e) => setVariantNotes(e.target.value)}
                  placeholder="Variant notes"
                  className="w-full bg-transparent border border-wheat/15 rounded-2xl px-4 py-3 text-sm outline-none focus:border-clay"
                />
              </div>
              <button
                onClick={saveVariant}
                className="rounded-2xl border border-wheat/15 px-4 py-3 text-sm font-medium text-wheat/75"
              >
                Add variant
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-wheat/10 bg-wheat/5 p-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-wheat/40">
              Assign product to people
            </p>
            <div className="grid gap-3 mt-3">
              <select
                value={assignmentProductId}
                onChange={(e) => {
                  setAssignmentProductId(e.target.value);
                  setAssignmentVariantId("");
                }}
                className="w-full bg-transparent border border-wheat/15 rounded-2xl px-4 py-3 text-sm outline-none focus:border-clay"
              >
                <option value="">Select product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
              <select
                value={assignmentVariantId}
                onChange={(e) => setAssignmentVariantId(e.target.value)}
                className="w-full bg-transparent border border-wheat/15 rounded-2xl px-4 py-3 text-sm outline-none focus:border-clay"
                disabled={!assignmentProductId}
              >
                <option value="">All variants</option>
                {(variantsByProductId.get(assignmentProductId) ?? []).map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.name}
                    {variant.color ? ` · ${variant.color}` : ""}
                    {variant.size ? ` · ${variant.size}` : ""}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap gap-2">
                {people.map((person) => {
                  const active = assignmentPersonIds.includes(person.id);
                  return (
                    <button
                      key={person.id}
                      onClick={() =>
                        setAssignmentPersonIds((current) =>
                          current.includes(person.id)
                            ? current.filter((id) => id !== person.id)
                            : [...current, person.id]
                        )
                      }
                      className={`rounded-full px-3 py-1.5 text-xs border transition ${
                        active
                          ? "border-clay bg-clay/15 text-clay"
                          : "border-wheat/15 text-wheat/55"
                      }`}
                    >
                      {person.name}
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={assignmentStatus}
                  onChange={(e) => setAssignmentStatus(e.target.value as (typeof STATUSES)[number])}
                  className="w-full bg-transparent border border-wheat/15 rounded-2xl px-4 py-3 text-sm outline-none focus:border-clay"
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <input
                  value={assignmentQuantity}
                  onChange={(e) => setAssignmentQuantity(e.target.value)}
                  placeholder="Qty"
                  inputMode="numeric"
                  className="w-full bg-transparent border border-wheat/15 rounded-2xl px-4 py-3 text-sm outline-none focus:border-clay"
                />
              </div>
              <input
                value={assignmentNote}
                onChange={(e) => setAssignmentNote(e.target.value)}
                placeholder="Assignment note"
                className="w-full bg-transparent border border-wheat/15 rounded-2xl px-4 py-3 text-sm outline-none focus:border-clay"
              />
              <button
                onClick={assignProduct}
                className="rounded-2xl bg-clay text-ink px-4 py-3 text-sm font-medium flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                Assign
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5">
          {filteredProducts.length === 0 ? (
            <p className="text-wheat/40 text-sm py-4 text-center">
              No products yet. Add one above to start building the catalog.
            </p>
          ) : (
            <div className="grid gap-3">
              {filteredProducts.map((product) => {
                const productVariants = variantsByProductId.get(product.id) ?? [];
                const productAssignments = assignmentsByProductId.get(product.id) ?? [];
                const assignmentPreview = productAssignments
                  .slice(0, 3)
                  .map((assignment) => assignment.person?.name ?? peopleById.get(assignment.person_id)?.name ?? "Unknown")
                  .join(", ");
                return (
                  <article
                    key={product.id}
                    className="rounded-[28px] border border-wheat/10 bg-[#171a13] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-lg">{product.name}</h3>
                          <span className="rounded-full border border-wheat/10 bg-wheat/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-wheat/55">
                            {product.category}
                          </span>
                          {product.product_type ? (
                            <span className="rounded-full border border-wheat/10 bg-wheat/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-wheat/55">
                              {product.product_type}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm text-wheat/45 mt-1">
                          {product.brand || "No brand"}
                          {product.store ? ` · ${product.store}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setEditingProductId(product.id);
                            setProductName(product.name);
                            setProductCategory(product.category);
                            setProductType(product.product_type ?? "");
                            setProductBrand(product.brand ?? "");
                            setProductStore(product.store ?? "");
                            setProductLink(product.link ?? "");
                            setProductNotes(product.notes ?? "");
                          }}
                          className="h-9 w-9 rounded-full border border-wheat/15 flex items-center justify-center text-wheat/60"
                          aria-label={`Edit ${product.name}`}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => deleteProduct(product.id)}
                          className="h-9 w-9 rounded-full border border-wheat/15 flex items-center justify-center text-wheat/60"
                          aria-label={`Delete ${product.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {product.notes ? (
                      <p className="mt-3 text-sm text-wheat/65">{product.notes}</p>
                    ) : null}

                    {productVariants.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {productVariants.map((variant) => (
                          <span
                            key={variant.id}
                            className="rounded-full border border-wheat/15 bg-wheat/5 px-3 py-1.5 text-xs text-wheat/65 inline-flex items-center gap-2"
                          >
                            {variant.name}
                            {variant.color ? `· ${variant.color}` : ""}
                            {variant.size ? `· ${variant.size}` : ""}
                            <button
                              onClick={() => deleteVariant(variant.id)}
                              className="text-wheat/40"
                              aria-label={`Delete variant ${variant.name}`}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-4 text-xs text-wheat/40">No variants yet.</p>
                    )}
                    <p className="mt-4 text-xs text-wheat/45">
                      {productAssignments.length === 0
                        ? "No assignments yet."
                        : `${productAssignments.length} assignment${productAssignments.length === 1 ? "" : "s"}${assignmentPreview ? ` · ${assignmentPreview}` : ""}`}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[28px] border border-wheat/10 bg-[#171a13] p-4 mb-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <p className="font-medium">People</p>
            <p className="text-xs text-wheat/45 mt-1">
              Add the people you are buying for.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPeopleCollapsed((current) => !current)}
              className="h-9 rounded-full border border-wheat/15 px-3 text-xs uppercase tracking-[0.16em] text-wheat/60 flex items-center gap-1.5"
              aria-expanded={!peopleCollapsed}
              aria-label={peopleCollapsed ? "Expand people list" : "Collapse people list"}
            >
              {peopleCollapsed ? (
                <>
                  Show list
                  <ChevronDown size={14} />
                </>
              ) : (
                <>
                  Hide list
                  <ChevronUp size={14} />
                </>
              )}
            </button>
            {editingPersonId ? (
              <button
                onClick={resetPersonForm}
                className="h-9 w-9 rounded-full border border-wheat/15 flex items-center justify-center text-wheat/60"
                aria-label="Cancel person edit"
              >
                <X size={16} />
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3">
          <input
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            placeholder="Person name"
            className="w-full bg-transparent border border-wheat/15 rounded-2xl px-4 py-3 text-sm outline-none focus:border-clay"
          />
          <input
            value={personEmail}
            onChange={(e) => setPersonEmail(e.target.value)}
            placeholder="Email for receipts"
            inputMode="email"
            className="w-full bg-transparent border border-wheat/15 rounded-2xl px-4 py-3 text-sm outline-none focus:border-clay"
          />
          <input
            value={personRelation}
            onChange={(e) => setPersonRelation(e.target.value)}
            placeholder="Relation, like sister or friend"
            className="w-full bg-transparent border border-wheat/15 rounded-2xl px-4 py-3 text-sm outline-none focus:border-clay"
          />
          <textarea
            value={personNotes}
            onChange={(e) => setPersonNotes(e.target.value)}
            placeholder="Notes, likes, or sizes"
            rows={3}
            className="w-full bg-transparent border border-wheat/15 rounded-2xl px-4 py-3 text-sm outline-none focus:border-clay resize-none"
          />
          <button
            onClick={savePerson}
            className="rounded-2xl bg-clay text-ink px-4 py-3 text-sm font-medium flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            {editingPersonId ? "Save person" : "Add person"}
          </button>
        </div>

        {peopleCollapsed ? (
          <div className="mt-4 rounded-2xl border border-dashed border-wheat/10 bg-wheat/5 px-4 py-3 text-sm text-wheat/45 flex items-center justify-between gap-3">
            <span>{people.length} people saved</span>
            <button
              onClick={() => setPeopleCollapsed(false)}
              className="text-xs uppercase tracking-[0.16em] text-wheat/60"
            >
              Expand
            </button>
          </div>
        ) : (
          <div className="mt-4 grid gap-2">
            {people.length === 0 ? (
              <p className="text-sm text-wheat/40">
                No people yet. Add one so gifts can be assigned clearly.
              </p>
            ) : (
              people.map((person) => (
                <div
                  key={person.id}
                  className="rounded-2xl border border-wheat/10 bg-wheat/5 p-3 flex items-start justify-between gap-3"
                >
                  <div className="text-left flex-1">
                    <Link href={`/people/${person.id}`} className="block">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{person.name}</p>
                        {person.relation ? (
                          <span className="text-[11px] uppercase tracking-[0.18em] text-wheat/40">
                            {person.relation}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-wheat/45 mt-1">
                        {person.email ? `${person.email} · ` : ""}
                        {person.notes || "No notes yet"}
                      </p>
                    </Link>
                    <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-wheat/40">
                      Use the person dropdown above to filter assignments.
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEditPerson(person)}
                      className="h-9 w-9 rounded-full border border-wheat/15 flex items-center justify-center text-wheat/60"
                      aria-label={`Edit ${person.name}`}
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => deletePerson(person.id)}
                      className="h-9 w-9 rounded-full border border-wheat/15 flex items-center justify-center text-wheat/60"
                      aria-label={`Delete ${person.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      <section className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Search size={16} className="text-wheat/45" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search assignments"
            className="w-full bg-transparent border border-wheat/15 rounded-2xl px-4 py-3 text-sm outline-none focus:border-clay"
          />
        </div>

        <div className="mt-3 grid gap-3 rounded-3xl border border-wheat/10 bg-wheat/5 p-4">
          <label className="grid gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.24em] text-wheat/40">
              Person filter
            </span>
            <select
              value={personFilter}
              onChange={(e) => setPersonFilter(e.target.value)}
              className="w-full bg-transparent border border-wheat/15 rounded-2xl px-4 py-3 text-sm outline-none focus:border-clay"
            >
              <option value="all">All people</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.24em] text-wheat/40">
              Status filter
            </span>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as (typeof STATUSES)[number] | "all")
              }
              className="w-full bg-transparent border border-wheat/15 rounded-2xl px-4 py-3 text-sm outline-none focus:border-clay capitalize"
            >
              <option value="all">All statuses</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="flex-1 pb-6">
        {loading ? (
          <p className="text-wheat/40 text-sm py-8 text-center">Loading…</p>
        ) : filteredAssignments.length === 0 ? (
          <div className="rounded-[28px] border border-wheat/10 bg-[#171a13] p-6 text-center">
            <Users size={22} className="mx-auto text-wheat/45" />
            <p className="mt-3 font-medium">
              {assignments.length === 0
                ? "Nothing assigned yet."
                : "No matching assignments."}
            </p>
            <p className="text-sm text-wheat/45 mt-2">
              Use the product catalog above to assign products to people, then filter them here.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredAssignments.map((assignment) => {
              const person = assignment.person ?? peopleById.get(assignment.person_id) ?? null;
              const product = assignment.product ?? productsById.get(assignment.product_id) ?? null;
              const variant =
                assignment.variant ?? variants.find((item) => item.id === assignment.variant_id) ?? null;
              return (
                <article
                  key={assignment.id}
                  className="rounded-[28px] border border-wheat/10 bg-[#171a13] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-medium text-lg leading-tight">
                          {product?.name ?? "Unknown product"}
                        </h2>
                        <span className="rounded-full border border-wheat/10 bg-wheat/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-wheat/55">
                          {assignment.status}
                        </span>
                      </div>
                      <p className="text-sm text-wheat/45 mt-1">
                        {person?.name ?? "Unassigned"}
                        {person?.relation ? ` · ${person.relation}` : ""}
                        {product?.category ? ` · ${product.category}` : ""}
                        {" · "}
                        {shortDate(assignment.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => deleteAssignment(assignment.id)}
                        className="h-9 w-9 rounded-full border border-wheat/15 flex items-center justify-center text-wheat/60"
                        aria-label="Delete assignment"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm text-wheat/70">
                    <p>
                      <span className="text-wheat/40">Product:</span>{" "}
                      {product?.brand || product?.store
                        ? `${product?.brand ?? "No brand"}${product?.store ? ` · ${product.store}` : ""}`
                        : product?.product_type ?? "No details"}
                    </p>
                    <p>
                      <span className="text-wheat/40">Variant:</span>{" "}
                      {[variant?.name, variant?.color, variant?.size].filter(Boolean).join(" · ") || "Any variant"}
                    </p>
                    <p>
                      <span className="text-wheat/40">Amount:</span> {assignment.quantity}
                    </p>
                    <p>
                      <span className="text-wheat/40">Status:</span> {assignment.status}
                    </p>
                    {assignment.note ? (
                      <p>
                        <span className="text-wheat/40">Notes:</span> {assignment.note}
                      </p>
                    ) : null}
                  </div>

                  <p className="mt-4 text-xs text-wheat/45">
                    Use the dropdown filters above to narrow this list.
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <BottomNav />
    </main>
  );
}
