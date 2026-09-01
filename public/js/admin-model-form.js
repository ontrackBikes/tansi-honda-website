/**
 * Shared client-side logic for views/admin/add-model.ejs and edit-model.ejs.
 *
 * Both pages set `window.ADMIN_MODEL_FORM = { mode: "add"|"edit", bikeId, initialData }`
 * before loading this file. `initialData` (edit mode only) is the Bike document as
 * rendered by the server — it is used to pre-fill every dynamic section below so the
 * shape produced on submit always matches server/models/bike.model.js exactly.
 */
(function () {
  "use strict";

  const CONFIG = window.ADMIN_MODEL_FORM || { mode: "add", initialData: {} };
  const initial = CONFIG.initialData || {};

  const FEATURE_SECTIONS = [
    { key: "safety", label: "Safety" },
    { key: "comfort", label: "Comfort" },
    { key: "design", label: "Design" },
    { key: "technology", label: "Technology" },
  ];

  const SPEC_SECTIONS = [
    { key: "performance", label: "Performance" },
    { key: "body", label: "Body Dimensions" },
    { key: "engine", label: "Engine" },
    { key: "motor", label: "Motor (EV)" },
    { key: "transmission", label: "Transmission" },
    { key: "tyres", label: "Tyres & Brakes" },
    { key: "suspension", label: "Suspension & Frame" },
    { key: "electricals", label: "Electricals" },
    { key: "chassis", label: "Chassis" },
    { key: "battery_and_charging", label: "Battery & Charging" },
    { key: "connectivity_features", label: "Connectivity Features" },
  ];

  let variantCounter = 0;

  const escapeHtml = (val) =>
    String(val ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[c]);

  // ---------------------------------------------------------------------
  // Image upload helper (delegated) — works for cover image, color image
  // inputs and feature-item image inputs alike.
  // ---------------------------------------------------------------------
  document.addEventListener("change", async (e) => {
    const fileInput = e.target.closest(".img-upload-input");
    if (!fileInput) return;

    const row = fileInput.closest("[data-upload-row]");
    const textInput = row ? row.querySelector(".img-url-input") : null;
    const preview = row ? row.querySelector(".img-preview") : null;
    const statusEl = row ? row.querySelector(".img-upload-status") : null;

    const file = fileInput.files[0];
    if (!file) return;

    if (statusEl) {
      statusEl.textContent = "⏳ Uploading...";
      statusEl.className = "img-upload-status small text-warning fw-bold";
    }

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/admin/upload-image", { method: "POST", body: formData });
      const data = await res.json();

      if (data.url) {
        if (textInput) textInput.value = data.url;
        if (preview) {
          preview.src = data.url;
          preview.hidden = false;
        }
        if (statusEl) {
          statusEl.textContent = "✅ Uploaded";
          statusEl.className = "img-upload-status small text-success fw-bold";
        }
      } else {
        throw new Error(data.message || "Upload failed");
      }
    } catch (err) {
      if (statusEl) {
        statusEl.textContent = "❌ Upload failed";
        statusEl.className = "img-upload-status small text-danger fw-bold";
      }
    } finally {
      fileInput.value = "";
    }
  });

  const uploadRowTemplate = ({ urlValue = "", placeholder = "Image URL", inputClass = "" }) => `
    <div data-upload-row class="d-flex align-items-center gap-2">
      <img class="img-preview rounded-3 border" src="${escapeHtml(urlValue)}" ${urlValue ? "" : "hidden"}
        style="width:40px;height:40px;object-fit:cover;flex-shrink:0;">
      <input type="text" class="img-url-input form-control form-control-sm ${inputClass}"
        placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(urlValue)}">
      <label class="btn btn-outline-secondary btn-sm mb-0 flex-shrink-0" title="Upload image">
        <i class="bi bi-upload"></i>
        <input type="file" accept="image/*" class="img-upload-input d-none">
      </label>
    </div>
    <div class="img-upload-status small mb-0"></div>
  `;

  // ---------------------------------------------------------------------
  // Cover image
  // ---------------------------------------------------------------------
  function initCoverImage() {
    const input = document.getElementById("imageInput");
    const preview = document.getElementById("previewImage");
    const hidden = document.getElementById("imageUrl");
    const status = document.getElementById("uploadStatus");
    if (!input) return;

    input.addEventListener("change", async () => {
      const file = input.files[0];
      if (!file) return;

      status.textContent = "⏳ Uploading...";
      status.className = "small mt-2 mb-0 fw-bold text-warning";

      const formData = new FormData();
      formData.append("image", file);

      try {
        const res = await fetch("/admin/upload-image", { method: "POST", body: formData });
        const data = await res.json();
        if (data.url) {
          hidden.value = data.url;
          preview.src = data.url;
          status.textContent = "✅ Upload success";
          status.className = "small mt-2 mb-0 fw-bold text-success";
        } else {
          throw new Error(data.message || "Upload failed");
        }
      } catch (e) {
        status.textContent = "❌ Upload failed";
        status.className = "small mt-2 mb-0 fw-bold text-danger";
      }
    });
  }

  // ---------------------------------------------------------------------
  // Category / SubCategory toggle
  // ---------------------------------------------------------------------
  function initCategoryToggle() {
    const category = document.getElementById("category");
    const subBox = document.getElementById("subCategoryBox");
    if (!category || !subBox) return;

    const sync = () => {
      const isMotorcycle = category.value === "motorcycle";
      subBox.style.opacity = isMotorcycle ? "1" : "0.35";
      subBox.style.pointerEvents = isMotorcycle ? "auto" : "none";
      if (!isMotorcycle) subBox.querySelector("select").value = "";
    };
    category.addEventListener("change", sync);
    sync();
  }

  // ---------------------------------------------------------------------
  // Colors
  // ---------------------------------------------------------------------
  function colorRowTemplate(color = {}) {
    return `
      <div class="color-row p-3 rounded-3 bg-light border mb-2">
        <div class="row g-2 align-items-start">
          <div class="col-md-3">
            <label class="extra-small">Name</label>
            <input class="form-control form-control-sm color-name" placeholder="e.g. Red with Black" value="${escapeHtml(color.name)}">
          </div>
          <div class="col-md-3">
            <label class="extra-small">Hex Code</label>
            <div class="d-flex gap-2">
              <input type="color" class="form-control form-control-sm form-control-color color-code-picker" value="${escapeHtml(color.code || "#c00000")}" style="width:40px;padding:2px;">
              <input class="form-control form-control-sm color-code" placeholder="#C00000" value="${escapeHtml(color.code)}">
            </div>
          </div>
          <div class="col-md-5">
            <label class="extra-small">Image</label>
            ${uploadRowTemplate({ urlValue: color.image || "", placeholder: "Image path / URL", inputClass: "color-image" })}
          </div>
          <div class="col-md-1 d-flex align-items-end justify-content-end h-100">
            <button type="button" class="btn btn-outline-danger btn-sm remove-color-btn" title="Remove color">
              <i class="bi bi-trash3"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function initColors() {
    const list = document.getElementById("colorsList");
    const addBtn = document.getElementById("addColorBtn");
    if (!list || !addBtn) return;

    const colors = Array.isArray(initial.colors) ? initial.colors : [];
    if (colors.length) {
      list.innerHTML = colors.map(colorRowTemplate).join("");
    } else {
      list.insertAdjacentHTML("beforeend", colorRowTemplate());
    }

    addBtn.addEventListener("click", () => {
      list.insertAdjacentHTML("beforeend", colorRowTemplate());
    });

    list.addEventListener("click", (e) => {
      const removeBtn = e.target.closest(".remove-color-btn");
      if (!removeBtn) return;
      if (list.children.length <= 1) {
        alert("At least one color is required — every model page needs one.");
        return;
      }
      removeBtn.closest(".color-row").remove();
    });

    // keep the hex text + color swatch input in sync
    list.addEventListener("input", (e) => {
      if (e.target.classList.contains("color-code-picker")) {
        e.target.closest(".color-row").querySelector(".color-code").value = e.target.value;
      } else if (e.target.classList.contains("color-code")) {
        const picker = e.target.closest(".color-row").querySelector(".color-code-picker");
        if (/^#[0-9a-f]{6}$/i.test(e.target.value)) picker.value = e.target.value;
      }
    });
  }

  function collectColors() {
    return Array.from(document.querySelectorAll("#colorsList .color-row"))
      .map((row) => ({
        name: row.querySelector(".color-name").value.trim(),
        code: row.querySelector(".color-code").value.trim(),
        image: row.querySelector(".img-url-input").value.trim(),
      }))
      .filter((c) => c.name || c.code || c.image);
  }

  // ---------------------------------------------------------------------
  // Features
  // ---------------------------------------------------------------------
  function featureItemTemplate(item = {}) {
    return `
      <div class="feature-item-row p-3 rounded-3 bg-light border mb-2">
        <div class="row g-2">
          <div class="col-md-4">
            <label class="extra-small">Title</label>
            <input class="form-control form-control-sm feature-title" placeholder="e.g. Efficient CBS Braking" value="${escapeHtml(item.title)}">
          </div>
          <div class="col-md-5">
            <label class="extra-small">Image</label>
            ${uploadRowTemplate({ urlValue: item.image || "", placeholder: "Image URL", inputClass: "feature-image" })}
          </div>
          <div class="col-md-3">
            <label class="extra-small">Description</label>
            <div class="d-flex gap-2">
              <input class="form-control form-control-sm feature-desc" placeholder="Short description" value="${escapeHtml(item.description)}">
              <button type="button" class="btn btn-outline-danger btn-sm remove-feature-item-btn flex-shrink-0" title="Remove">
                <i class="bi bi-trash3"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function initFeatures() {
    FEATURE_SECTIONS.forEach(({ key, label }) => {
      const list = document.getElementById(`feature-items-${key}`);
      const addBtn = document.getElementById(`add-feature-item-${key}`);
      const showToggle = document.getElementById(`feature-show-${key}`);
      if (!list || !addBtn) return;

      const section = initial.features?.[key];
      const items = Array.isArray(section?.items) ? section.items : [];
      list.innerHTML = items.map(featureItemTemplate).join("");
      if (showToggle) showToggle.checked = !!section?.show;

      addBtn.addEventListener("click", () => {
        list.insertAdjacentHTML("beforeend", featureItemTemplate());
        if (showToggle) showToggle.checked = true;
      });

      list.addEventListener("click", (e) => {
        const removeBtn = e.target.closest(".remove-feature-item-btn");
        if (!removeBtn) return;
        removeBtn.closest(".feature-item-row").remove();
      });
    });
  }

  function collectFeatures() {
    const features = {};
    FEATURE_SECTIONS.forEach(({ key }) => {
      const list = document.getElementById(`feature-items-${key}`);
      const showToggle = document.getElementById(`feature-show-${key}`);
      const items = Array.from(list ? list.querySelectorAll(".feature-item-row") : [])
        .map((row) => ({
          title: row.querySelector(".feature-title").value.trim(),
          image: row.querySelector(".img-url-input").value.trim(),
          description: row.querySelector(".feature-desc").value.trim(),
        }))
        .filter((it) => it.title || it.image || it.description);

      features[key] = { show: !!(showToggle && showToggle.checked) && items.length > 0, items };
    });
    return features;
  }

  // ---------------------------------------------------------------------
  // Variants (price + specs)
  // ---------------------------------------------------------------------
  function kvRowTemplate(key = "", value = "") {
    return `
      <div class="kv-row d-flex gap-2 mb-2">
        <input class="form-control form-control-sm kv-key" placeholder="Field (e.g. length)" value="${escapeHtml(key)}">
        <input class="form-control form-control-sm kv-value" placeholder="Value (e.g. 1955 mm)" value="${escapeHtml(value)}">
        <button type="button" class="btn btn-outline-danger btn-sm remove-kv-btn flex-shrink-0" title="Remove"><i class="bi bi-trash3"></i></button>
      </div>
    `;
  }

  function specSectionTemplate(variantIdx, key, label, section) {
    const items = Array.isArray(section?.items) ? section.items : [];
    const rows = items
      .map((it) => {
        const k = Object.keys(it || {})[0] || "";
        return kvRowTemplate(k, k ? it[k] : "");
      })
      .join("");
    const panelId = `v${variantIdx}-specs-${key}`;

    return `
      <div class="accordion-item">
        <h2 class="accordion-header">
          <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#${panelId}">
            ${escapeHtml(label)}
          </button>
        </h2>
        <div id="${panelId}" class="accordion-collapse collapse" data-spec-section="${key}">
          <div class="accordion-body">
            <div class="form-check form-switch mb-3">
              <input class="form-check-input spec-show-toggle" type="checkbox" ${section?.show ? "checked" : ""} id="${panelId}-show">
              <label class="form-check-label small fw-bold" for="${panelId}-show">Show this section on the model page</label>
            </div>
            <div class="kv-rows">${rows}</div>
            <button type="button" class="btn btn-outline-secondary btn-sm add-kv-btn"><i class="bi bi-plus-lg"></i> Add Field</button>
          </div>
        </div>
      </div>
    `;
  }

  function variantBlockTemplate(variant = {}) {
    const idx = variantCounter++;
    const p = variant.price || {};
    const specs = variant.specs || {};

    const specSections = SPEC_SECTIONS.map(({ key, label }) =>
      specSectionTemplate(idx, key, label, specs[key]),
    ).join("");

    return `
      <div class="variant-block card border shadow-sm rounded-4 p-3 mb-3" data-variant-index="${idx}">
        <div class="d-flex align-items-center justify-content-between mb-3">
          <h6 class="fw-bold mb-0 text-danger">Variant</h6>
          <button type="button" class="btn btn-outline-danger btn-sm remove-variant-btn"><i class="bi bi-trash3"></i> Remove Variant</button>
        </div>

        <div class="row g-2 mb-3">
          <div class="col-md-6">
            <label class="extra-small">Variant Name</label>
            <input class="form-control form-control-sm variant-name" placeholder="e.g. Standard" value="${escapeHtml(variant.name)}">
          </div>
          <div class="col-md-6">
            <label class="extra-small">SKU Code</label>
            <input class="form-control form-control-sm variant-sku" placeholder="e.g. SH100-STD" value="${escapeHtml(variant.sku)}">
          </div>
        </div>

        <div class="p-3 rounded-3 bg-light border mb-3">
          <h6 class="fw-bold small text-uppercase mb-3">💰 Price Breakup</h6>
          <div class="row g-2">
            <div class="col-md-4">
              <label class="extra-small">Ex-Showroom (required) *</label>
              <input type="number" min="0" class="form-control form-control-sm price-exShowroom" value="${escapeHtml(p.exShowroom ?? "")}" required>
            </div>
            <div class="col-md-4">
              <label class="extra-small">Road Tax & Reg.</label>
              <input type="number" min="0" class="form-control form-control-sm price-roadTaxAndReg" value="${escapeHtml(p.roadTaxAndReg ?? "")}">
            </div>
            <div class="col-md-4">
              <label class="extra-small">Insurance (Base)</label>
              <input type="number" min="0" class="form-control form-control-sm price-insuranceBase" value="${escapeHtml(p.insuranceBase ?? "")}">
            </div>
            <div class="col-md-4">
              <label class="extra-small">On-Road (Base)</label>
              <input type="number" min="0" class="form-control form-control-sm price-onRoadBase" value="${escapeHtml(p.onRoadBase ?? "")}">
            </div>
            <div class="col-md-4">
              <label class="extra-small">Zero Dep. Premium</label>
              <input type="number" min="0" class="form-control form-control-sm price-zeroDepPremium" value="${escapeHtml(p.zeroDepPremium ?? "")}">
            </div>
            <div class="col-md-4">
              <label class="extra-small">Final On-Road</label>
              <input type="number" min="0" class="form-control form-control-sm price-finalOnRoad" value="${escapeHtml(p.finalOnRoad ?? "")}">
            </div>
          </div>
        </div>

        <h6 class="fw-bold small text-uppercase mb-2">Specifications</h6>
        <div class="accordion">${specSections}</div>
      </div>
    `;
  }

  function initVariants() {
    const list = document.getElementById("variantsList");
    const addBtn = document.getElementById("addVariantBtn");
    if (!list || !addBtn) return;

    const variants = Array.isArray(initial.variants) ? initial.variants : [];
    if (variants.length) {
      list.innerHTML = variants.map(variantBlockTemplate).join("");
    } else {
      list.insertAdjacentHTML("beforeend", variantBlockTemplate());
    }

    addBtn.addEventListener("click", () => {
      list.insertAdjacentHTML("beforeend", variantBlockTemplate());
    });

    list.addEventListener("click", (e) => {
      if (e.target.closest(".remove-variant-btn")) {
        if (list.children.length <= 1) {
          alert("At least one variant with an Ex-Showroom price is required.");
          return;
        }
        e.target.closest(".variant-block").remove();
        return;
      }

      if (e.target.closest(".add-kv-btn")) {
        const body = e.target.closest(".accordion-body");
        body.querySelector(".kv-rows").insertAdjacentHTML("beforeend", kvRowTemplate());
        return;
      }

      if (e.target.closest(".remove-kv-btn")) {
        e.target.closest(".kv-row").remove();
        return;
      }
    });
  }

  function collectVariants() {
    return Array.from(document.querySelectorAll("#variantsList .variant-block")).map((block) => {
      const num = (sel) => {
        const v = block.querySelector(sel).value;
        return v === "" ? 0 : Number(v);
      };

      const specs = {};
      SPEC_SECTIONS.forEach(({ key }) => {
        const panel = block.querySelector(`[data-spec-section="${key}"]`);
        const items = Array.from(panel.querySelectorAll(".kv-row"))
          .map((row) => {
            const k = row.querySelector(".kv-key").value.trim();
            const v = row.querySelector(".kv-value").value.trim();
            return k ? { [k]: v } : null;
          })
          .filter(Boolean);
        const show = panel.querySelector(".spec-show-toggle").checked;
        specs[key] = { show: show && items.length > 0, items };
      });

      return {
        name: block.querySelector(".variant-name").value.trim(),
        sku: block.querySelector(".variant-sku").value.trim(),
        price: {
          exShowroom: num(".price-exShowroom"),
          roadTaxAndReg: num(".price-roadTaxAndReg"),
          insuranceBase: num(".price-insuranceBase"),
          onRoadBase: num(".price-onRoadBase"),
          zeroDepPremium: num(".price-zeroDepPremium"),
          finalOnRoad: num(".price-finalOnRoad"),
          currency: "INR",
        },
        specs,
      };
    });
  }

  // ---------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------
  function showFormError(message) {
    const alertBox = document.getElementById("formAlert");
    if (!alertBox) {
      alert(message);
      return;
    }
    alertBox.textContent = message;
    alertBox.hidden = false;
    alertBox.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function initSubmit() {
    const form = document.getElementById("modelForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const colors = collectColors();
      const variants = collectVariants();

      if (!colors.length) {
        showFormError("Please add at least one color variant.");
        return;
      }
      if (!variants.length || !variants[0].price.exShowroom) {
        showFormError("Please add at least one variant with an Ex-Showroom price.");
        return;
      }

      const category = document.getElementById("category").value;
      const subCategorySelect = document.querySelector("#subCategoryBox select");

      const payload = {
        name: document.getElementById("modelName").value.trim(),
        category,
        subCategory: category === "motorcycle" ? subCategorySelect.value || null : null,
        description: document.getElementById("description").value.trim(),
        brochure: document.getElementById("brochure").value.trim(),
        coverImage: document.getElementById("imageUrl").value.trim(),
        isActive: document.getElementById("statusSwitch") ? document.getElementById("statusSwitch").checked : true,
        bookingsOpen: document.getElementById("bookingsOpenSwitch").checked,
        colors,
        features: collectFeatures(),
        variants,
      };

      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = "⏳ Saving...";

      const alertBox = document.getElementById("formAlert");
      if (alertBox) alertBox.hidden = true;

      try {
        const res = await fetch(form.action, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.message || "Something went wrong while saving.");
        }

        window.location.href = data.redirect || "/admin/models";
      } catch (err) {
        showFormError(err.message);
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initCoverImage();
    initCategoryToggle();
    initColors();
    initFeatures();
    initVariants();
    initSubmit();
  });
})();
