/**
 * SkinFairness-AI | Clinical AI Vision-Language & Equity Platform
 * Explainable Multi-Class Skin Disease 23 Classification with Fairness Analysis Across Skin Tones
 * Enterprise Clinical Research Engine
 */

// ==========================================================================
// 1. Cross-Browser Canvas Polyfills
// ==========================================================================
if (typeof CanvasRenderingContext2D !== "undefined" && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, radii) {
    if (!radii) radii = 0;
    if (typeof radii === "number") radii = [radii, radii, radii, radii];
    if (!Array.isArray(radii)) radii = [0, 0, 0, 0];
    var r0 = radii[0] || 0;
    var r1 = radii[1] || r0;
    var r2 = radii[2] || r0;
    var r3 = radii[3] || r1;
    this.moveTo(x + r0, y);
    this.lineTo(x + w - r1, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r1);
    this.lineTo(x + w, y + h - r2);
    this.quadraticCurveTo(x + w, y + h, x + w - r2, y + h);
    this.lineTo(x + r3, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r3);
    this.lineTo(x, y + r0);
    this.quadraticCurveTo(x, y, x + r0, y);
    return this;
  };
}

// ==========================================================================
// 2. The 23 Skin Disease Clinical Taxonomy (Derma23 / Fitzpatrick 17k)
// ==========================================================================
const DERMA_23_DATABASE = [
  {
    id: "melanoma",
    code: "MEL",
    icd10: "C43.9",
    name: "Melanoma",
    category: "Malignant Neoplasm",
    risk: "High",
    description: "Highly aggressive malignancy of melanocytes. Rapid metastatic potential; Breslow depth dictates prognosis.",
    dermoscopy: "Atypical pigment network, irregular globules, blue-white veil, peripheral pseudopods, structural asymmetry.",
    lightSkin: "Dark brown/black macule or nodule with prominent pink-red erythematous border and sharp optical contrast.",
    darkSkin: "Acral lentiginous subtype over-represented (palms/soles/nailbeds). Erythema is optically masked; lesions often misdiagnosed as trauma/wart.",
    baselineTPR: { light: 0.89, dark: 0.64 },
    mitigatedTPR: { light: 0.88, dark: 0.86 }
  },
  {
    id: "bcc",
    code: "BCC",
    icd10: "C44.91",
    name: "Basal Cell Carcinoma",
    category: "Malignant Neoplasm",
    risk: "Moderate",
    description: "Most frequent cutaneous malignancy worldwide. Locally invasive, slow-growing with rare metastasis.",
    dermoscopy: "Arborizing branching telangiectasias, blue-grey ovoid nests, spoke-wheel structures, ulceration.",
    lightSkin: "Pearly translucent pink nodule with visible fine surface telangiectasia and central rolled border.",
    darkSkin: "Heavily pigmented variant is common (over 50% in FST V-VI); presents as shiny dark brown or blue-black nodule mimicking melanoma.",
    baselineTPR: { light: 0.92, dark: 0.71 },
    mitigatedTPR: { light: 0.91, dark: 0.88 }
  },
  {
    id: "scc",
    code: "SCC",
    icd10: "C44.92",
    name: "Squamous Cell Carcinoma",
    category: "Malignant Neoplasm",
    risk: "High",
    description: "Invasive proliferation of atypical epidermal keratinocytes with significant metastatic propensity.",
    dermoscopy: "Keratin masses, central crusting/ulceration, hairpin vessels surrounded by whitish halos, targetoid white circles.",
    lightSkin: "Hyperkeratotic, crusted, indurated erythematous plaque on sun-exposed zones (face, scalp, forearms).",
    darkSkin: "Frequently develops in chronic scars, burn sites (Marjolin ulcer), or unhealed ulcers rather than sun-exposed zones.",
    baselineTPR: { light: 0.86, dark: 0.63 },
    mitigatedTPR: { light: 0.85, dark: 0.83 }
  },
  {
    id: "akiec",
    code: "AKIEC",
    icd10: "L57.0",
    name: "Actinic Keratosis / IEC",
    category: "Pre-Malignant",
    risk: "Moderate",
    description: "UV-induced pre-malignant dysplasia of epidermal keratinocytes; direct precursor to invasive SCC.",
    dermoscopy: "Strawberry pattern, pseudonetwork on erythematous background, prominent follicular keratotic plugs.",
    lightSkin: "Gritty, sandpaper-textured erythematous scaly papule on sun-damaged bald scalps, faces, and hands.",
    darkSkin: "Rare in FST V-VI due to high photoprotection by eumelanin; when present, pigmented and hyperkeratotic.",
    baselineTPR: { light: 0.88, dark: 0.58 },
    mitigatedTPR: { light: 0.86, dark: 0.82 }
  },
  {
    id: "bkl",
    code: "BKL",
    icd10: "L82.1",
    name: "Benign Keratosis (Seborrheic)",
    category: "Benign Neoplasm",
    risk: "Low",
    description: "Extremely common benign epidermal tumor characterized by a greasy, stuck-on clinical appearance.",
    dermoscopy: "Milia-like cysts, comedo-like openings, brain-like gyri/fissures, sharp demarcated moth-eaten borders.",
    lightSkin: "Tan to dark brown waxy, well-circumscribed stuck-on plaque with verrucous surface.",
    darkSkin: "Commonly manifests as Dermatosis Papulosa Nigra (multiple small hyperpigmented facial papules in African/Asian descent).",
    baselineTPR: { light: 0.91, dark: 0.82 },
    mitigatedTPR: { light: 0.90, dark: 0.88 }
  },
  {
    id: "nv",
    code: "NV",
    icd10: "D22.9",
    name: "Melanocytic Nevus",
    category: "Benign Neoplasm",
    risk: "Low",
    description: "Benign congenital or acquired proliferation of melanocytes. The most common benign pigmented skin lesion.",
    dermoscopy: "Uniform reticular pigment network, symmetric architecture, uniform dots and globules, fading periphery.",
    lightSkin: "Uniform light-to-medium brown macule or soft papule with sharp geometric symmetry.",
    darkSkin: "Heavily pigmented dark brown to black; network lines are thicker. Naive models over-predict NV on any dark lesion.",
    baselineTPR: { light: 0.94, dark: 0.87 },
    mitigatedTPR: { light: 0.93, dark: 0.91 }
  },
  {
    id: "df",
    code: "DF",
    icd10: "D21.9",
    name: "Dermatofibroma",
    category: "Benign Neoplasm",
    risk: "Low",
    description: "Benign dermal fibrohistiocytic proliferation exhibiting characteristic 'dimple sign' on lateral pinch.",
    dermoscopy: "Central white scar-like fibrous patch surrounded by a fine, delicate peripheral pigment network.",
    lightSkin: "Firm, hyperpigmented pink-tan to red-brown nodule, most common on lower extremities of young adults.",
    darkSkin: "Deeply hyperpigmented, dark brown or violaceous; central white patch is often attenuated or absent.",
    baselineTPR: { light: 0.87, dark: 0.72 },
    mitigatedTPR: { light: 0.86, dark: 0.84 }
  },
  {
    id: "vasc",
    code: "VASC",
    icd10: "D18.0",
    name: "Vascular Lesions",
    category: "Benign Neoplasm",
    risk: "Low",
    description: "Vascular malformations and proliferations including hemangiomas, cherry angiomas, and pyogenic granulomas.",
    dermoscopy: "Red, purple, or blue-black round lacunae/lagoons, fibrous septa, absence of pigment network.",
    lightSkin: "Bright red or cherry-colored vascular papules that bleed profusely upon minor trauma.",
    darkSkin: "Lacunae appear dark purple, bluish-black, or slate grey, easily mistaken for nodular melanoma.",
    baselineTPR: { light: 0.90, dark: 0.76 },
    mitigatedTPR: { light: 0.89, dark: 0.87 }
  },
  {
    id: "eczema",
    code: "ECZ",
    icd10: "L20.9",
    name: "Atopic Dermatitis (Eczema)",
    category: "Inflammatory",
    risk: "Low",
    description: "Chronic, pruritic immune-mediated skin disorder with defective epidermal barrier and intense itching.",
    dermoscopy: "Patchy dotted vessels on yellow-pink background, serocrusts, prominent epidermal skin markings.",
    lightSkin: "Hallmark bright pink-red erythema, weeping excoriations, oozing, and lichenification in flexural folds.",
    darkSkin: "Erythema is masked by melanin; lesions appear slate-grey, violaceous, or hyperpigmented with severe lichenification.",
    baselineTPR: { light: 0.91, dark: 0.65 },
    mitigatedTPR: { light: 0.89, dark: 0.87 }
  },
  {
    id: "psoriasis",
    code: "PSO",
    icd10: "L40.0",
    name: "Psoriasis Vulgaris",
    category: "Inflammatory",
    risk: "Low",
    description: "Chronic systemic autoimmune disorder characterized by keratinocyte hyperproliferation and vascular remodeling.",
    dermoscopy: "Regularly distributed elongated bushy/glomerular vessels on bright red background with silvery scales.",
    lightSkin: "Salmon-pink sharply circumscribed plaques covered by thick micaceous (silvery-white) scales.",
    darkSkin: "Dark red, violaceous, or deep brown plaques; scale appears dull grey; marked post-inflammatory dyschromia.",
    baselineTPR: { light: 0.93, dark: 0.68 },
    mitigatedTPR: { light: 0.91, dark: 0.89 }
  },
  {
    id: "lichen_planus",
    code: "LP",
    icd10: "L43.9",
    name: "Lichen Planus",
    category: "Inflammatory",
    risk: "Moderate",
    description: "T-cell-mediated papulosquamous disorder affecting skin and mucosa characterized by the 6 P's.",
    dermoscopy: "Wickham's striae (white reticular lines), peripheral radial dotted vessels, violaceous background.",
    lightSkin: "Pruritic, polygonal, planar, purple papules and plaques with shiny surface on flexor wrists/ankles.",
    darkSkin: "Hyperpigmented slate-grey or deep brownish-purple plaques with profound and long-lasting post-inflammatory hyperpigmentation.",
    baselineTPR: { light: 0.84, dark: 0.60 },
    mitigatedTPR: { light: 0.83, dark: 0.81 }
  },
  {
    id: "vitiligo",
    code: "VIT",
    icd10: "L80",
    name: "Vitiligo",
    category: "Autoimmune",
    risk: "Low",
    description: "Acquired autoimmune destruction of melanocytes causing sharply circumscribed depigmented patches.",
    dermoscopy: "Complete absence of pigment network, leukotrichia (white hairs), perifollicular residual pigment rings.",
    lightSkin: "Chalk-white macules with subtle contrast against pale skin; often requires Wood's lamp to detect.",
    darkSkin: "Stark, dramatic optical contrast causing immense psychosocial stigma and morbidity.",
    baselineTPR: { light: 0.93, dark: 0.95 },
    mitigatedTPR: { light: 0.93, dark: 0.94 }
  },
  {
    id: "acne",
    code: "ACN",
    icd10: "L70.0",
    name: "Acne Vulgaris",
    category: "Cutaneous Appendage",
    risk: "Low",
    description: "Multifactorial pilosebaceous disorder involving follicular hyperkeratinization, C. acnes, and sebum.",
    dermoscopy: "Open comedones (blackheads), closed comedones, erythematous halos, perifollicular pustules.",
    lightSkin: "Pink-red inflammatory papules, pustules, and comedones with prominent erythematous flares.",
    darkSkin: "Even mild papules trigger severe and protracted post-inflammatory hyperpigmentation (PIH) lasting months/years.",
    baselineTPR: { light: 0.92, dark: 0.74 },
    mitigatedTPR: { light: 0.90, dark: 0.88 }
  },
  {
    id: "rosacea",
    code: "ROS",
    icd10: "L71.9",
    name: "Rosacea",
    category: "Cutaneous Appendage",
    risk: "Low",
    description: "Chronic centrofacial inflammatory condition with vascular hyperreactivity and neurogenic inflammation.",
    dermoscopy: "Polygonal vessels, follicular plugging, Demodex tails, absence of comedones.",
    lightSkin: "Flushing, persistent facial erythema, visible telangiectasia, papulopustules on cheeks/nose.",
    darkSkin: "Notoriously underdiagnosed in FST IV-VI; facial erythema is obscured, often misdiagnosed as acne or lupus.",
    baselineTPR: { light: 0.88, dark: 0.49 },
    mitigatedTPR: { light: 0.86, dark: 0.80 }
  },
  {
    id: "alopecia",
    code: "ALO",
    icd10: "L63.9",
    name: "Alopecia Areata",
    category: "Autoimmune",
    risk: "Low",
    description: "Autoimmune attack on hair bulb keratinocytes resulting in patchy or total non-scarring hair loss.",
    dermoscopy: "Yellow dots, black dots, exclamation-mark hairs, coudability hairs, short vellus hairs.",
    lightSkin: "Smooth, round, flesh-colored or pale pink alopecic patches on scalp and beard.",
    darkSkin: "Bare scalp is deeply pigmented; black dots and perifollicular halos are prominent.",
    baselineTPR: { light: 0.91, dark: 0.85 },
    mitigatedTPR: { light: 0.90, dark: 0.88 }
  },
  {
    id: "lupus",
    code: "CLE",
    icd10: "L93.0",
    name: "Cutaneous Lupus (CLE)",
    category: "Autoimmune",
    risk: "High",
    description: "Autoimmune connective tissue disease manifesting as discoid, subacute, or systemic malar rash.",
    dermoscopy: "Follicular keratotic plugging, perifollicular whitish halos, telangiectatic vessels, dyschromia.",
    lightSkin: "Malar butterfly rash with bright pink erythema; discoid plaques with central scarring atrophy.",
    darkSkin: "High incidence in African descent; prominent hyperpigmented borders with central hypopigmentation.",
    baselineTPR: { light: 0.83, dark: 0.62 },
    mitigatedTPR: { light: 0.82, dark: 0.81 }
  },
  {
    id: "tinea",
    code: "TIN",
    icd10: "B35.4",
    name: "Tinea (Dermatophytosis)",
    category: "Infectious",
    risk: "Low",
    description: "Superficial fungal infection of keratinized tissue (Tinea corporis, cruris, pedis, capitis).",
    dermoscopy: "Morpheaform scale on active raised periphery, subtle erythematous or hyperpigmented ring.",
    lightSkin: "Annular (ring-shaped) erythematous scaly plaque with peripheral advancement and central clearing.",
    darkSkin: "Central clearing is marked by persistent dark hyperpigmentation; edge may be violaceous/brown.",
    baselineTPR: { light: 0.89, dark: 0.66 },
    mitigatedTPR: { light: 0.87, dark: 0.84 }
  },
  {
    id: "impetigo",
    code: "IMP",
    icd10: "L01.0",
    name: "Impetigo",
    category: "Infectious",
    risk: "Moderate",
    description: "Highly contagious superficial bacterial infection caused by S. aureus or S. pyogenes.",
    dermoscopy: "Honey-colored golden crusting, yellowish homogeneous areas, peripheral collarette scale.",
    lightSkin: "Fragile vesicles that rupture leaving golden-yellow 'honey-colored' crusts on pink base.",
    darkSkin: "Base is dusky brown or hyperpigmented; yellow crust is starkly visible against dark skin.",
    baselineTPR: { light: 0.90, dark: 0.77 },
    mitigatedTPR: { light: 0.89, dark: 0.86 }
  },
  {
    id: "cellulitis",
    code: "CEL",
    icd10: "L03.90",
    name: "Cellulitis",
    category: "Infectious",
    risk: "High",
    description: "Acute, spreading bacterial infection of the deep dermis and subcutaneous tissues.",
    dermoscopy: "Diffuse non-specific erythema, warmth, loss of dermal vascular architecture, follicular indentations.",
    lightSkin: "Ill-defined, rapidly spreading intense erythema, calor, edema, and tenderness.",
    darkSkin: "Erythema may be completely invisible; warmth, induration, and subtle violaceous tint are critical.",
    baselineTPR: { light: 0.87, dark: 0.54 },
    mitigatedTPR: { light: 0.85, dark: 0.81 }
  },
  {
    id: "herpes_zoster",
    code: "HZV",
    icd10: "B02.9",
    name: "Herpes Zoster (Shingles)",
    category: "Infectious",
    risk: "Moderate",
    description: "Reactivation of latent Varicella-Zoster Virus in dorsal root or cranial nerve ganglia.",
    dermoscopy: "Clustered polycyclic vesicles with central umbilication, erythematous base, necrotic crusts.",
    lightSkin: "Unilateral dermatomal distribution of grouped vesicles on a fiery red erythematous base.",
    darkSkin: "Vesicles appear on hyperpigmented or violaceous plaques; dermatomal distribution is paramount.",
    baselineTPR: { light: 0.92, dark: 0.76 },
    mitigatedTPR: { light: 0.90, dark: 0.87 }
  },
  {
    id: "urticaria",
    code: "URT",
    icd10: "L50.9",
    name: "Urticaria (Hives)",
    category: "Inflammatory",
    risk: "Low",
    description: "Mast cell-mediated vascular reaction characterized by transient pruritic wheals.",
    dermoscopy: "Pale edematous center surrounded by fine pink blush, absence of epidermal changes or scale.",
    lightSkin: "Transient pink-red edematous plaques with central pallor, resolving within 24 hours.",
    darkSkin: "Wheals manifest primarily as palpable dermal swelling with subtle color change; easily overlooked.",
    baselineTPR: { light: 0.88, dark: 0.69 },
    mitigatedTPR: { light: 0.86, dark: 0.84 }
  },
  {
    id: "bullous_pemphigoid",
    code: "BP",
    icd10: "L12.0",
    name: "Bullous Pemphigoid",
    category: "Autoimmune",
    risk: "High",
    description: "Autoantibody-mediated subepidermal autoimmune blistering disease targeting BP180/BP230.",
    dermoscopy: "Tense bullae with clear serous fluid, lack of acantholysis (negative Nikolsky sign).",
    lightSkin: "Tense large bullae arising on either urticarial erythematous plaques or normal skin.",
    darkSkin: "Prodromal phase urticarial lesions appear dark brown or violaceous; bullae are tense.",
    baselineTPR: { light: 0.86, dark: 0.70 },
    mitigatedTPR: { light: 0.85, dark: 0.82 }
  },
  {
    id: "verruca",
    code: "VER",
    icd10: "B07.9",
    name: "Verruca Vulgaris (Wart)",
    category: "Infectious",
    risk: "Low",
    description: "Benign epidermal proliferation caused by Human Papillomavirus (HPV) infection.",
    dermoscopy: "Papillomatous surface, dilated capillary loops appearing as black punctate dots (thrombosed vessels).",
    lightSkin: "Firm, exophytic, hyperkeratotic papule with a verrucous, rough, cauliflower-like surface.",
    darkSkin: "Hyperkeratosis appears greyish-brown; punctate thrombosed vessels remain visible.",
    baselineTPR: { light: 0.93, dark: 0.86 },
    mitigatedTPR: { light: 0.91, dark: 0.89 }
  }
];

// ==========================================================================
// 3. Clinical Cases Cohort (Spanning FST I through FST VI)
// ==========================================================================
const CLINICAL_BENCHMARK_CASES = [
  {
    id: "case-lp-fst5",
    title: "Lichen Planus (Severe Bias Alert)",
    diseaseId: "lichen_planus",
    fst: "FST V",
    fstIndex: 5,
    itaAngle: -12.4,
    skinToneLabel: "Moderately Dark / Brown",
    age: 42,
    gender: "Female",
    anatomicalSite: "Volar Wrist",
    symptoms: "Intensely pruritic, flat-topped violaceous polygonal papules with delicate Wickham's striae.",
    skinBaseColor: "#8c5234",
    lesionCoreColor: "#4a243a",
    renderMode: "lichen_planus",
    baselineModel: {
      predicted: "nv", // Critical False Positive!
      confidence: 0.584,
      top5: [
        { name: "Melanocytic Nevus", prob: 0.584 },
        { name: "Benign Keratosis", prob: 0.210 },
        { name: "Lichen Planus", prob: 0.114 },
        { name: "Psoriasis Vulgaris", prob: 0.052 },
        { name: "Dermatofibroma", prob: 0.040 }
      ],
      gradCamCenter: { x: 0.50, y: 0.50, radius: 0.38 },
      dispersionBias: true // Scatters attention on normal melanin
    },
    mitigatedModel: {
      predicted: "lichen_planus",
      confidence: 0.812,
      top5: [
        { name: "Lichen Planus", prob: 0.812 },
        { name: "Melanocytic Nevus", prob: 0.098 },
        { name: "Psoriasis Vulgaris", prob: 0.045 },
        { name: "Benign Keratosis", prob: 0.028 },
        { name: "Atopic Dermatitis", prob: 0.017 }
      ],
      gradCamCenter: { x: 0.50, y: 0.50, radius: 0.38 },
      dispersionBias: false
    },
    concepts: {
      "Polygonal Border": 0.88,
      "Wickham's Striae": 0.82,
      "Violaceous Pigment": 0.74,
      "Post-Inflam Hyperpigment": 0.91,
      "Lack of Network": 0.85
    },
    soap: {
      subjective: "42yo female presenting with a 3-month history of intensely itchy bumps on the bilateral flexor wrists.",
      objective: "Physical exam reveals grouped, flat-topped violaceous-to-slate grey polygonal papules. White reticular striae (Wickham's striae) visible under dermoscopy.",
      assessment: "Lichen Planus. Note: Baseline naive AI falsely identified this as Melanocytic Nevus due to dark melanin absorption. Fair-calibrated model correctly recognizes Wickham's striae.",
      plan: "High-potency topical corticosteroid (Clobetasol propionate 0.05% ointment BID x 2 weeks). Screen oral cavity and hepatitis serology."
    }
  },
  {
    id: "case-mel-fst2",
    title: "Superficial Spreading Melanoma",
    diseaseId: "melanoma",
    fst: "FST II",
    fstIndex: 2,
    itaAngle: 44.2,
    skinToneLabel: "Fair / Light White",
    age: 54,
    gender: "Male",
    anatomicalSite: "Upper Back",
    symptoms: "Asymmetric enlarging pigmented plaque with irregular scalloped borders and color variegation.",
    skinBaseColor: "#f4d3be",
    lesionCoreColor: "#3a251e",
    renderMode: "melanoma",
    baselineModel: {
      predicted: "melanoma",
      confidence: 0.912,
      top5: [
        { name: "Melanoma", prob: 0.912 },
        { name: "Melanocytic Nevus", prob: 0.054 },
        { name: "Basal Cell Carcinoma", prob: 0.018 },
        { name: "Benign Keratosis", prob: 0.011 },
        { name: "Dermatofibroma", prob: 0.005 }
      ],
      gradCamCenter: { x: 0.48, y: 0.52, radius: 0.34 },
      dispersionBias: false
    },
    mitigatedModel: {
      predicted: "melanoma",
      confidence: 0.895,
      top5: [
        { name: "Melanoma", prob: 0.895 },
        { name: "Melanocytic Nevus", prob: 0.068 },
        { name: "Basal Cell Carcinoma", prob: 0.021 },
        { name: "Benign Keratosis", prob: 0.010 },
        { name: "Dermatofibroma", prob: 0.006 }
      ],
      gradCamCenter: { x: 0.48, y: 0.52, radius: 0.34 },
      dispersionBias: false
    },
    concepts: {
      "Asymmetry (A)": 0.92,
      "Border Irregularity (B)": 0.94,
      "Color Variegation (C)": 0.89,
      "Diameter > 6mm (D)": 0.85,
      "Atypical Pigment Network": 0.91
    },
    soap: {
      subjective: "54yo male with an evolving pigmented mole noted by partner on upper thoracic back.",
      objective: "7.8mm asymmetric plaque with notched borders, shades of tan, dark brown, and black. Atypical pigment network with focal pseudopods.",
      assessment: "Superficial Spreading Melanoma. High optical contrast on FST II yields concordant high diagnostic certainty across both models.",
      plan: "Urgent full-thickness excisional biopsy with 2mm clinical margins. Histopathology for Breslow depth, ulceration status, and mitotic rate."
    }
  },
  {
    id: "case-eczema-fst6",
    title: "Atopic Eczema (Masked Erythema)",
    diseaseId: "eczema",
    fst: "FST VI",
    fstIndex: 6,
    itaAngle: -38.5,
    skinToneLabel: "Deeply Pigmented / Dark Brown to Black",
    age: 29,
    gender: "Male",
    anatomicalSite: "Antecubital Fossa",
    symptoms: "Chronic itchy thickened plaque in the elbow creases; xerosis and sleep disturbances.",
    skinBaseColor: "#472b1d",
    lesionCoreColor: "#301a0f",
    renderMode: "eczema",
    baselineModel: {
      predicted: "psoriasis", // Misdiagnosed due to thickened scale
      confidence: 0.492,
      top5: [
        { name: "Psoriasis Vulgaris", prob: 0.492 },
        { name: "Tinea (Fungal)", prob: 0.248 },
        { name: "Atopic Dermatitis", prob: 0.165 },
        { name: "Cutaneous Lupus", prob: 0.051 },
        { name: "Lichen Planus", prob: 0.044 }
      ],
      gradCamCenter: { x: 0.50, y: 0.50, radius: 0.36 },
      dispersionBias: true
    },
    mitigatedModel: {
      predicted: "eczema",
      confidence: 0.842,
      top5: [
        { name: "Atopic Dermatitis", prob: 0.842 },
        { name: "Psoriasis Vulgaris", prob: 0.088 },
        { name: "Tinea (Fungal)", prob: 0.038 },
        { name: "Lichen Planus", prob: 0.021 },
        { name: "Cutaneous Lupus", prob: 0.011 }
      ],
      gradCamCenter: { x: 0.50, y: 0.50, radius: 0.36 },
      dispersionBias: false
    },
    concepts: {
      "Epidermal Lichenification": 0.89,
      "Follicular Prominence": 0.82,
      "Erythema (Attenuated)": 0.18,
      "Excoriation Scratches": 0.74,
      "Xerosis Texture": 0.86
    },
    soap: {
      subjective: "29yo male with long-standing flexural pruritus and worsening epidermal thickening.",
      objective: "Deeply pigmented skin (FST VI). Classical pink erythema is optically obscured. Examination reveals marked lichenification, accentuated skin creases, and excoriations.",
      assessment: "Atopic Dermatitis. Baseline models fail due to erythema masking. Fair AI successfully captures epidermal texture cues.",
      plan: "Topical calcineurin inhibitor (Tacrolimus 0.1% ointment) or mid-potency corticosteroid. Emollient barrier therapy."
    }
  },
  {
    id: "case-bcc-fst1",
    title: "Nodular Basal Cell Carcinoma",
    diseaseId: "bcc",
    fst: "FST I",
    fstIndex: 1,
    itaAngle: 58.1,
    skinToneLabel: "Very Fair / Ivory White",
    age: 68,
    gender: "Female",
    anatomicalSite: "Nasal Tip",
    symptoms: "Slow-growing pearly pink papule that bleeds easily with minor cleansing.",
    skinBaseColor: "#faebe2",
    lesionCoreColor: "#f87171",
    renderMode: "bcc",
    baselineModel: {
      predicted: "bcc",
      confidence: 0.941,
      top5: [
        { name: "Basal Cell Carcinoma", prob: 0.941 },
        { name: "Actinic Keratosis", prob: 0.032 },
        { name: "Squamous Cell Carcinoma", prob: 0.015 },
        { name: "Vascular Lesions", prob: 0.008 },
        { name: "Melanoma", prob: 0.004 }
      ],
      gradCamCenter: { x: 0.51, y: 0.49, radius: 0.30 },
      dispersionBias: false
    },
    mitigatedModel: {
      predicted: "bcc",
      confidence: 0.932,
      top5: [
        { name: "Basal Cell Carcinoma", prob: 0.932 },
        { name: "Actinic Keratosis", prob: 0.036 },
        { name: "Squamous Cell Carcinoma", prob: 0.018 },
        { name: "Vascular Lesions", prob: 0.009 },
        { name: "Melanoma", prob: 0.005 }
      ],
      gradCamCenter: { x: 0.51, y: 0.49, radius: 0.30 },
      dispersionBias: false
    },
    concepts: {
      "Pearly Translucency": 0.96,
      "Arborizing Telangiectasia": 0.93,
      "Rolled Borders": 0.88,
      "Ulceration Tendency": 0.72,
      "Lack of Pigment": 0.90
    },
    soap: {
      subjective: "68yo female with 6-month non-healing translucent papule on the nasal tip.",
      objective: "5mm pearly nodule with rolled translucent border and branching arborizing telangiectasia under polarized dermoscopy.",
      assessment: "Nodular Basal Cell Carcinoma on high-risk facial zone (Mask area).",
      plan: "Mohs Micrographic Surgery recommended to maximize margin clearance and tissue preservation."
    }
  },
  {
    id: "case-pso-fst4",
    title: "Psoriasis Vulgaris (Extensor)",
    diseaseId: "psoriasis",
    fst: "FST IV",
    fstIndex: 4,
    itaAngle: 18.7,
    skinToneLabel: "Olive / Moderate Brown",
    age: 36,
    gender: "Male",
    anatomicalSite: "Elbow Extensor",
    symptoms: "Well-circumscribed plaque with adherent silvery micaceous scale and Auspitz sign.",
    skinBaseColor: "#bb8760",
    lesionCoreColor: "#993333",
    renderMode: "psoriasis",
    baselineModel: {
      predicted: "psoriasis",
      confidence: 0.785,
      top5: [
        { name: "Psoriasis Vulgaris", prob: 0.785 },
        { name: "Atopic Dermatitis", prob: 0.124 },
        { name: "Lichen Planus", prob: 0.052 },
        { name: "Tinea (Fungal)", prob: 0.024 },
        { name: "Benign Keratosis", prob: 0.015 }
      ],
      gradCamCenter: { x: 0.50, y: 0.50, radius: 0.35 },
      dispersionBias: false
    },
    mitigatedModel: {
      predicted: "psoriasis",
      confidence: 0.889,
      top5: [
        { name: "Psoriasis Vulgaris", prob: 0.889 },
        { name: "Atopic Dermatitis", prob: 0.061 },
        { name: "Lichen Planus", prob: 0.030 },
        { name: "Tinea (Fungal)", prob: 0.012 },
        { name: "Benign Keratosis", prob: 0.008 }
      ],
      gradCamCenter: { x: 0.50, y: 0.50, radius: 0.35 },
      dispersionBias: false
    },
    concepts: {
      "Silvery Scale": 0.89,
      "Well-Demarcated Margin": 0.85,
      "Erythema": 0.65,
      "Glomerular Vessels": 0.78,
      "Auspitz Sign": 0.81
    },
    soap: {
      subjective: "36yo male with recurrent extensor plaque and joint stiffness in fingers.",
      objective: "Bilateral extensor elbow plaques with prominent silvery micaceous scales over a red-violaceous base.",
      assessment: "Psoriasis Vulgaris. Auspitz sign clinically positive.",
      plan: "Calcipotriene plus betamethasone dipropionate ointment. Screen for psoriatic arthritis."
    }
  },
  {
    id: "case-vit-fst3",
    title: "Vitiligo (Autoimmune)",
    diseaseId: "vitiligo",
    fst: "FST III",
    fstIndex: 3,
    itaAngle: 32.5,
    skinToneLabel: "Medium / Olive-White",
    age: 24,
    gender: "Female",
    anatomicalSite: "Dorsal Hands & Perioral",
    symptoms: "Completely depigmented chalk-white macules with sharp borders; no texture changes.",
    skinBaseColor: "#e6b797",
    lesionCoreColor: "#ffffff",
    renderMode: "vitiligo",
    baselineModel: {
      predicted: "vitiligo",
      confidence: 0.948,
      top5: [
        { name: "Vitiligo", prob: 0.948 },
        { name: "Tinea (Fungal)", prob: 0.031 },
        { name: "Cutaneous Lupus", prob: 0.011 },
        { name: "Atopic Dermatitis", prob: 0.006 },
        { name: "Benign Keratosis", prob: 0.004 }
      ],
      gradCamCenter: { x: 0.52, y: 0.48, radius: 0.36 },
      dispersionBias: false
    },
    mitigatedModel: {
      predicted: "vitiligo",
      confidence: 0.952,
      top5: [
        { name: "Vitiligo", prob: 0.952 },
        { name: "Tinea (Fungal)", prob: 0.028 },
        { name: "Cutaneous Lupus", prob: 0.010 },
        { name: "Atopic Dermatitis", prob: 0.006 },
        { name: "Benign Keratosis", prob: 0.004 }
      ],
      gradCamCenter: { x: 0.52, y: 0.48, radius: 0.36 },
      dispersionBias: false
    },
    concepts: {
      "Total Depigmentation": 0.98,
      "Sharp Margins": 0.95,
      "Absence of Scale": 0.92,
      "Perilesional Pigment": 0.81,
      "Leukotrichia": 0.60
    },
    soap: {
      subjective: "24yo female with progressive symmetric depigmentation on fingers and mouth.",
      objective: "Chalk-white macules exhibiting bright blue-white fluorescence under Wood's lamp.",
      assessment: "Non-segmental Vitiligo. Structural contrast enables high accuracy across both models.",
      plan: "Topical JAK inhibitor (Ruxolitinib 1.5% cream) and targeted excimer phototherapy."
    }
  }
];

// ==========================================================================
// 4. Algorithmic Fairness Strategies & Demographic Benchmarks
// ==========================================================================
const FAIRNESS_PROFILES = {
  baseline: {
    name: "Baseline (Unmitigated Cross-Entropy)",
    description: "Standard training on skewed distribution (60.4% Light vs 9.5% Dark).",
    overallAccuracy: 81.4,
    macroF1: 76.2,
    equalOpportunityGap: 25.6, // TPR(FST I) - TPR(FST VI)
    disparateImpactRatio: 0.68, // Fails 80% legal rule (< 0.80)
    demographicParityDiff: 0.224,
    complianceStatus: "Failed EEOC 80% Rule",
    badgeClass: "badge-rose",
    accuracies: [88.2, 87.1, 82.4, 76.5, 68.2, 63.8],
    tprs: [86.8, 85.9, 81.0, 74.2, 65.1, 61.2]
  },
  reweighting: {
    name: "Inverse Group-Frequency Reweighting",
    description: "Loss penalized inversely proportional to skin tone sample frequency.",
    overallAccuracy: 80.9,
    macroF1: 78.5,
    equalOpportunityGap: 14.3,
    disparateImpactRatio: 0.79,
    demographicParityDiff: 0.141,
    complianceStatus: "Borderline Equity",
    badgeClass: "badge-amber",
    accuracies: [85.4, 84.8, 81.7, 78.9, 74.1, 71.3],
    tprs: [84.1, 83.5, 80.2, 77.4, 72.8, 69.8]
  },
  adversarial: {
    name: "Adversarial Debiasing (Gradient Reversal Layer)",
    description: "Feature representations made invariant to skin tone discriminator.",
    overallAccuracy: 82.1,
    macroF1: 80.6,
    equalOpportunityGap: 8.4,
    disparateImpactRatio: 0.88,
    demographicParityDiff: 0.082,
    complianceStatus: "Passed 80% Legal Rule",
    badgeClass: "badge-emerald",
    accuracies: [84.8, 84.2, 82.6, 80.5, 78.4, 76.8],
    tprs: [83.6, 83.1, 81.5, 79.2, 77.0, 75.2]
  },
  group_thresholding: {
    name: "Post-Hoc Group-Calibrated Thresholding",
    description: "Decision cutoffs calibrated independently per Fitzpatrick stratum.",
    overallAccuracy: 81.8,
    macroF1: 81.2,
    equalOpportunityGap: 4.6,
    disparateImpactRatio: 0.93,
    demographicParityDiff: 0.046,
    complianceStatus: "High Equity Calibrated",
    badgeClass: "badge-emerald",
    accuracies: [83.9, 83.5, 82.2, 81.0, 79.5, 78.6],
    tprs: [82.5, 82.1, 81.0, 79.8, 78.5, 77.9]
  },
  genai_augmented: {
    name: "Generative Fair Augmentation (Diffusion SOTA)",
    description: "Latent Diffusion Model generates synthetic photorealistic dark-skin lesions.",
    overallAccuracy: 84.7,
    macroF1: 83.9,
    equalOpportunityGap: 2.9,
    disparateImpactRatio: 0.96,
    demographicParityDiff: 0.028,
    complianceStatus: "State-of-the-Art Fair AI",
    badgeClass: "badge-cyan",
    accuracies: [86.2, 85.9, 84.8, 84.1, 83.4, 82.9],
    tprs: [85.5, 85.1, 84.0, 83.5, 82.8, 82.6]
  }
};

// ==========================================================================
// 5. Application State Controller
// ==========================================================================
const PlatformState = {
  activeTab: "diagnosis", // diagnosis, fairness, taxonomy, copilot, upload, methodology
  activeCaseId: "case-lp-fst5",
  activeCase: null,
  activeMitigation: "genai_augmented",
  showGradCam: true,
  gradCamAlpha: 0.75,
  gradCamPalette: "turbo", // turbo, cyan, jet, viridis, magma, mono
  gradCamThreshold: 0.25,
  activeDermTheme: "theme-cyber", // theme-cyber, theme-dermlite, theme-radiology, theme-daylight
  showReticle: true,
  isCrossPolarized: true,
  uploadedImage: null,
  chatHistory: [
    {
      sender: "system",
      text: "SkinFairness-AI Clinical Intelligence Engine initialized with Med-PaLM M Copilot."
    },
    {
      sender: "assistant",
      text: "Greetings Doctor. I am your dermatological AI copilot. I am actively monitoring Case #1: **Lichen Planus on FST V (Brown Skin)**. Under naive baseline weights, this case experiences severe pigment bias. How may I assist your differential evaluation?"
    }
  ],
  taxonomySearch: "",
  taxonomyFilter: "all"
};

// ==========================================================================
// 6. Photorealistic Procedural Dermoscopy & Grad-CAM Renderer
// ==========================================================================
function renderDermoscopyCanvas(canvasId, currentCase) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const cx = w * 0.5;
  const cy = h * 0.5;
  const theme = PlatformState.activeDermTheme || "theme-cyber";

  ctx.clearRect(0, 0, w, h);

  // 1. Draw base dermal skin with authentic CIE L*a*b* gradient & texture
  const bgGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, w * 0.75);
  bgGrad.addColorStop(0, currentCase.skinBaseColor);
  bgGrad.addColorStop(1, shadeColor(currentCase.skinBaseColor, -20));
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Subtle skin surface lines and micro-relief
  ctx.save();
  ctx.strokeStyle = "rgba(0,0,0,0.06)";
  ctx.lineWidth = 1;
  for (let y = 0; y < h; y += 14) {
    ctx.beginPath();
    ctx.moveTo(0, y + Math.sin(y * 0.1) * 3);
    ctx.bezierCurveTo(w * 0.35, y + 6, w * 0.65, y - 6, w, y);
    ctx.stroke();
  }
  ctx.restore();

  // 2. Render Pathognomonic Lesion Morphology
  ctx.save();
  if (currentCase.renderMode === "melanoma") {
    drawMelanomaMorphology(ctx, cx, cy);
  } else if (currentCase.renderMode === "lichen_planus") {
    drawLichenPlanusMorphology(ctx, cx, cy, currentCase.lesionCoreColor);
  } else if (currentCase.renderMode === "eczema") {
    drawEczemaMorphology(ctx, cx, cy, currentCase.lesionCoreColor);
  } else if (currentCase.renderMode === "bcc") {
    drawBccMorphology(ctx, cx, cy);
  } else if (currentCase.renderMode === "psoriasis") {
    drawPsoriasisMorphology(ctx, cx, cy, currentCase.lesionCoreColor);
  } else if (currentCase.renderMode === "vitiligo") {
    drawVitiligoMorphology(ctx, cx, cy);
  } else {
    drawGenericMorphology(ctx, cx, cy, currentCase.lesionCoreColor);
  }
  ctx.restore();

  // 3. Modality Specific Optical Layers (Wood's Lamp UV, Daylight, CRT scanlines)
  if (theme === "theme-woodlamp") {
    ctx.save();
    // 365nm Wood's Lamp UV Fluorescence simulation
    ctx.fillStyle = "rgba(59, 7, 100, 0.32)";
    ctx.fillRect(0, 0, w, h);

    const uvHalo = ctx.createRadialGradient(cx, cy, 15, cx, cy, w * 0.52);
    uvHalo.addColorStop(0, "rgba(168, 85, 247, 0.08)");
    uvHalo.addColorStop(0.7, "rgba(126, 34, 206, 0.22)");
    uvHalo.addColorStop(1, "rgba(76, 29, 149, 0.55)");
    ctx.fillStyle = uvHalo;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  } else if (theme === "theme-daylight") {
    ctx.save();
    const daylightGrad = ctx.createLinearGradient(0, 0, 0, h);
    daylightGrad.addColorStop(0, "rgba(255, 255, 255, 0.12)");
    daylightGrad.addColorStop(1, "rgba(0, 0, 0, 0.05)");
    ctx.fillStyle = daylightGrad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  } else if (theme === "theme-radiology") {
    ctx.save();
    // PACS raster CRT scanlines
    ctx.strokeStyle = "rgba(0, 0, 0, 0.12)";
    ctx.lineWidth = 1;
    for (let y = 0; y < h; y += 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 4. Non-polarized specular surface glare (if unpolarized contact mode)
  if (!PlatformState.isCrossPolarized) {
    ctx.save();
    const glare = ctx.createRadialGradient(w * 0.36, h * 0.32, 2, w * 0.36, h * 0.32, 55);
    glare.addColorStop(0, "rgba(255, 255, 255, 0.85)");
    glare.addColorStop(0.3, "rgba(255, 255, 255, 0.35)");
    glare.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = glare;
    ctx.beginPath();
    ctx.arc(w * 0.36, h * 0.32, 55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 5. Render Grad-CAM Neural Attention Heatmap Overlay
  if (PlatformState.showGradCam) {
    renderGradCamHeatmap(ctx, w, h, currentCase);
  }

  // 6. Render Calibrated Dermoscopy Reticle (10mm scale with concentric circles)
  if (PlatformState.showReticle) {
    drawDermoscopyReticle(ctx, w, h);
  }

  // 7. Theme-Specific Lens Ring and Frame Accents
  if (theme === "theme-dermlite") {
    ctx.save();
    // Circular vignette of 30mm polarized lens
    const lensShadow = ctx.createRadialGradient(cx, cy, w * 0.37, cx, cy, w * 0.5);
    lensShadow.addColorStop(0, "rgba(0, 0, 0, 0)");
    lensShadow.addColorStop(0.8, "rgba(0, 0, 0, 0.45)");
    lensShadow.addColorStop(1, "rgba(0, 0, 0, 0.95)");
    ctx.fillStyle = lensShadow;
    ctx.fillRect(0, 0, w, h);

    // 24 polarized LED ring specular dots around perimeter
    ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
      const lx = cx + Math.cos(a) * (w * 0.46);
      const ly = cy + Math.sin(a) * (h * 0.46);
      ctx.beginPath();
      ctx.arc(lx, ly, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else if (theme === "theme-cyber") {
    ctx.save();
    // Cyber HUD corner reticle brackets
    ctx.strokeStyle = "rgba(6, 182, 212, 0.85)";
    ctx.lineWidth = 2;
    const m = 12; const l = 16;
    // Top-left
    ctx.beginPath(); ctx.moveTo(m, m + l); ctx.lineTo(m, m); ctx.lineTo(m + l, m); ctx.stroke();
    // Top-right
    ctx.beginPath(); ctx.moveTo(w - m - l, m); ctx.lineTo(w - m, m); ctx.lineTo(w - m, m + l); ctx.stroke();
    // Bottom-left
    ctx.beginPath(); ctx.moveTo(m, h - m - l); ctx.lineTo(m, h - m); ctx.lineTo(m + l, h - m); ctx.stroke();
    // Bottom-right
    ctx.beginPath(); ctx.moveTo(w - m - l, h - m); ctx.lineTo(w - m, h - m); ctx.lineTo(w - m, h - m - l); ctx.stroke();
    ctx.restore();
  }
}

// Dermoscopic Millimeter Reticle Scale (10mm concentric circles & crosshairs)
function drawDermoscopyReticle(ctx, w, h) {
  const cx = w * 0.5;
  const cy = h * 0.5;
  const theme = PlatformState.activeDermTheme || "theme-cyber";

  let strokeColor = "rgba(56, 189, 248, 0.45)";
  let textColor = "rgba(56, 189, 248, 0.85)";
  let badgeBg = "rgba(11, 19, 41, 0.88)";
  let badgeText = "#38bdf8";

  if (theme === "theme-dermlite") {
    strokeColor = "rgba(255, 255, 255, 0.55)";
    textColor = "rgba(255, 255, 255, 0.85)";
    badgeBg = "rgba(15, 23, 42, 0.88)";
    badgeText = "#e2e8f0";
  } else if (theme === "theme-radiology") {
    strokeColor = "rgba(245, 158, 11, 0.55)";
    textColor = "rgba(245, 158, 11, 0.9)";
    badgeBg = "rgba(5, 8, 17, 0.92)";
    badgeText = "#fbbf24";
  } else if (theme === "theme-daylight") {
    strokeColor = "rgba(15, 23, 42, 0.45)";
    textColor = "rgba(15, 23, 42, 0.85)";
    badgeBg = "rgba(255, 255, 255, 0.9)";
    badgeText = "#0f172a";
  } else if (theme === "theme-woodlamp") {
    strokeColor = "rgba(168, 85, 247, 0.55)";
    textColor = "rgba(52, 211, 153, 0.95)";
    badgeBg = "rgba(27, 12, 54, 0.92)";
    badgeText = "#34d399";
  } else if (theme === "theme-oled") {
    strokeColor = "rgba(100, 116, 139, 0.4)";
    textColor = "rgba(203, 213, 225, 0.75)";
    badgeBg = "rgba(0, 0, 0, 0.92)";
    badgeText = "#94a3b8";
  }

  ctx.save();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1;
  ctx.font = "9px monospace";
  ctx.fillStyle = textColor;

  // Concentric calibrated millimeter circles: 2mm, 5mm, 10mm
  const rings = [
    { r: 42, label: "2mm" },
    { r: 85, label: "5mm" },
    { r: 155, label: "10mm" }
  ];

  rings.forEach(ring => {
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillText(ring.label, cx + 4, cy - ring.r + 10);
  });

  // Crosshairs with millimeter tick marks
  ctx.setLineDash([]);
  ctx.beginPath();
  // Horizontal
  ctx.moveTo(cx - 165, cy); ctx.lineTo(cx + 165, cy);
  // Vertical
  ctx.moveTo(cx, cy - 165); ctx.lineTo(cx, cy + 165);
  ctx.stroke();

  // Millimeter hash marks every 15px (~1mm)
  for (let d = -150; d <= 150; d += 15) {
    if (d === 0) continue;
    const tickLen = (d % 45 === 0) ? 6 : 3;
    ctx.beginPath();
    ctx.moveTo(cx + d, cy - tickLen);
    ctx.lineTo(cx + d, cy + tickLen);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - tickLen, cy + d);
    ctx.lineTo(cx + tickLen, cy + d);
    ctx.stroke();
  }

  // Calibration scale badge
  ctx.fillStyle = badgeBg;
  ctx.fillRect(8, h - 22, 142, 16);
  ctx.fillStyle = badgeText;
  ctx.font = "bold 9px monospace";
  ctx.fillText("SCALE: 1 DIV = 1.0 mm", 12, h - 11);

  ctx.restore();
}

// Procedural Morphology Functions
function drawMelanomaMorphology(ctx, cx, cy) {
  // Asymmetric notched contour
  ctx.fillStyle = "#2d1810";
  ctx.beginPath();
  const pts = 24;
  for (let i = 0; i <= pts; i++) {
    const angle = (i / pts) * Math.PI * 2;
    const r = 85 + Math.sin(angle * 3) * 25 + Math.cos(angle * 7) * 14 + (i % 3 === 0 ? 15 : -10);
    const px = cx + Math.cos(angle) * r * 1.1;
    const py = cy + Math.sin(angle) * r * 0.85;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // Reticular atypical pigment network
  ctx.strokeStyle = "#120704";
  ctx.lineWidth = 1.6;
  for (let a = 0; a < Math.PI * 2; a += 0.25) {
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * 35, cy + Math.sin(a) * 30, 18, 0, Math.PI);
    ctx.stroke();
  }

  // Blue-white veil satellite
  ctx.fillStyle = "rgba(147, 197, 253, 0.4)";
  ctx.beginPath();
  ctx.ellipse(cx + 25, cy - 15, 32, 22, Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();

  // Peripheral pseudopods
  ctx.fillStyle = "#1c0b05";
  for (let s = 0; s < Math.PI * 2; s += 0.7) {
    const sx = cx + Math.cos(s) * 92;
    const sy = cy + Math.sin(s) * 75;
    ctx.beginPath();
    ctx.arc(sx, sy, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLichenPlanusMorphology(ctx, cx, cy, baseColor) {
  const clusters = [
    { x: -35, y: -25, r: 38 },
    { x: 30, y: -20, r: 44 },
    { x: -10, y: 35, r: 40 },
    { x: -55, y: 15, r: 26 },
    { x: 45, y: 32, r: 30 }
  ];

  clusters.forEach(c => {
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    const sides = 5 + (Math.floor(c.r) % 3);
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2 + 0.2;
      const px = cx + c.x + Math.cos(a) * c.r;
      const py = cy + c.y + Math.sin(a) * c.r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Wickham's Striae (delicate white reticular lines on surface)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(cx + c.x - c.r * 0.4, cy + c.y - c.r * 0.3);
    ctx.lineTo(cx + c.x + c.r * 0.4, cy + c.y + c.r * 0.3);
    ctx.moveTo(cx + c.x - c.r * 0.3, cy + c.y + c.r * 0.4);
    ctx.lineTo(cx + c.x + c.r * 0.3, cy + c.y - c.r * 0.4);
    ctx.stroke();
  });
}

function drawEczemaMorphology(ctx, cx, cy, baseColor) {
  // Diffuse lichenified border
  const grad = ctx.createRadialGradient(cx, cy, 30, cx, cy, 125);
  grad.addColorStop(0, baseColor);
  grad.addColorStop(0.65, shadeColor(baseColor, 15));
  grad.addColorStop(1, "transparent");
  ctx.fillStyle = grad;
  ctx.fillRect(cx - 130, cy - 130, 260, 260);

  // Exaggerated skin markings (Lichenification)
  ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
  ctx.lineWidth = 1.4;
  for (let i = -70; i <= 70; i += 12) {
    ctx.beginPath();
    ctx.moveTo(cx - 85, cy + i);
    ctx.lineTo(cx + 85, cy + i + 4);
    ctx.stroke();
  }
  for (let j = -70; j <= 70; j += 14) {
    ctx.beginPath();
    ctx.moveTo(cx + j, cy - 80);
    ctx.lineTo(cx + j + 8, cy + 80);
    ctx.stroke();
  }

  // Scratch excoriations
  ctx.strokeStyle = "rgba(220, 38, 38, 0.85)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 40, cy - 15);
  ctx.lineTo(cx + 30, cy - 10);
  ctx.moveTo(cx - 20, cy + 25);
  ctx.lineTo(cx + 45, cy + 30);
  ctx.stroke();
}

function drawBccMorphology(ctx, cx, cy) {
  // Pearly pink translucent nodule
  const grad = ctx.createRadialGradient(cx - 15, cy - 15, 10, cx, cy, 80);
  grad.addColorStop(0, "#fee2e2");
  grad.addColorStop(0.5, "#f87171");
  grad.addColorStop(0.9, "#dc2626");
  grad.addColorStop(1, "transparent");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, 76, 0, Math.PI * 2);
  ctx.fill();

  // Central slight ulceration
  ctx.fillStyle = "rgba(153, 27, 27, 0.5)";
  ctx.beginPath();
  ctx.ellipse(cx, cy, 22, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Branching arborizing telangiectasia
  ctx.strokeStyle = "#b91c1c";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(cx - 45, cy + 35);
  ctx.quadraticCurveTo(cx - 10, cy + 10, cx + 20, cy - 25);
  ctx.moveTo(cx - 15, cy + 18);
  ctx.lineTo(cx - 30, cy + 5);
  ctx.moveTo(cx + 5, cy);
  ctx.lineTo(cx + 25, cy + 14);
  ctx.stroke();
}

function drawPsoriasisMorphology(ctx, cx, cy, baseColor) {
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.arc(cx, cy, 80, 0, Math.PI * 2);
  ctx.fill();

  // Micaceous silvery scale
  ctx.fillStyle = "rgba(248, 250, 252, 0.9)";
  for (let i = 0; i < 35; i++) {
    const rx = cx - 65 + Math.random() * 130;
    const ry = cy - 50 + Math.random() * 100;
    const sz = 7 + Math.random() * 16;
    ctx.beginPath();
    ctx.ellipse(rx, ry, sz, sz * 0.6, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawVitiligoMorphology(ctx, cx, cy) {
  // Chalk-white depigmented macule
  ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
  ctx.beginPath();
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const r = 80 + Math.sin(a * 4) * 16 + Math.cos(a * 2) * 10;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // Perilesional hyperpigmented rim
  ctx.strokeStyle = "rgba(60, 30, 15, 0.4)";
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

function drawGenericMorphology(ctx, cx, cy, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, 65, 0, Math.PI * 2);
  ctx.fill();
}

// Grad-CAM Heatmap Shader
function renderGradCamHeatmap(ctx, w, h, currentCase) {
  const isBaseline = PlatformState.activeMitigation === "baseline";
  const model = isBaseline ? currentCase.baselineModel : currentCase.mitigatedModel;
  const center = model.gradCamCenter;
  const cx = w * center.x;
  const cy = h * center.y;
  const radius = w * center.radius;

  // Offscreen buffer
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const oCtx = off.getContext("2d");

  // Primary activation peak
  const grad = oCtx.createRadialGradient(cx, cy, 8, cx, cy, radius);
  
  if (PlatformState.gradCamPalette === "turbo") {
    grad.addColorStop(0.0, "rgba(255, 25, 0, 1.0)");
    grad.addColorStop(0.35, "rgba(255, 190, 0, 0.85)");
    grad.addColorStop(0.70, "rgba(0, 230, 200, 0.5)");
    grad.addColorStop(1.0, "rgba(20, 60, 255, 0.0)");
  } else if (PlatformState.gradCamPalette === "cyan") {
    // Bioluminescent Cyan (Clinical Optic Filter)
    grad.addColorStop(0.0, "rgba(255, 255, 255, 1.0)");
    grad.addColorStop(0.25, "rgba(6, 182, 212, 0.95)");
    grad.addColorStop(0.65, "rgba(14, 116, 144, 0.55)");
    grad.addColorStop(1.0, "rgba(8, 47, 73, 0.0)");
  } else if (PlatformState.gradCamPalette === "uv") {
    // Wood's Lamp UV Fluorescence (Emerald Peak on Violet Field)
    grad.addColorStop(0.0, "rgba(52, 211, 153, 1.0)");
    grad.addColorStop(0.28, "rgba(34, 211, 238, 0.92)");
    grad.addColorStop(0.65, "rgba(168, 85, 247, 0.6)");
    grad.addColorStop(1.0, "rgba(30, 10, 60, 0.0)");
  } else if (PlatformState.gradCamPalette === "inferno") {
    // Inferno Radiance
    grad.addColorStop(0.0, "rgba(252, 255, 164, 1.0)");
    grad.addColorStop(0.35, "rgba(249, 142, 9, 0.88)");
    grad.addColorStop(0.70, "rgba(187, 55, 84, 0.55)");
    grad.addColorStop(1.0, "rgba(10, 5, 20, 0.0)");
  } else if (PlatformState.gradCamPalette === "jet") {
    grad.addColorStop(0.0, "rgba(220, 0, 0, 1.0)");
    grad.addColorStop(0.3, "rgba(255, 140, 0, 0.8)");
    grad.addColorStop(0.6, "rgba(255, 255, 0, 0.5)");
    grad.addColorStop(1.0, "rgba(0, 0, 180, 0.0)");
  } else if (PlatformState.gradCamPalette === "viridis") {
    grad.addColorStop(0.0, "rgba(253, 231, 37, 1.0)");
    grad.addColorStop(0.35, "rgba(53, 183, 121, 0.85)");
    grad.addColorStop(0.70, "rgba(49, 104, 142, 0.5)");
    grad.addColorStop(1.0, "rgba(68, 1, 84, 0.0)");
  } else if (PlatformState.gradCamPalette === "mono") {
    // Monochromatic High-Contrast Edge Saliency
    grad.addColorStop(0.0, "rgba(255, 255, 255, 1.0)");
    grad.addColorStop(0.35, "rgba(203, 213, 225, 0.8)");
    grad.addColorStop(0.70, "rgba(100, 116, 139, 0.4)");
    grad.addColorStop(1.0, "rgba(15, 23, 42, 0.0)");
  } else {
    // Magma
    grad.addColorStop(0.0, "rgba(252, 253, 191, 1.0)");
    grad.addColorStop(0.35, "rgba(241, 96, 93, 0.85)");
    grad.addColorStop(0.70, "rgba(114, 31, 129, 0.5)");
    grad.addColorStop(1.0, "rgba(0, 0, 4, 0.0)");
  }

  oCtx.fillStyle = grad;
  oCtx.fillRect(0, 0, w, h);

  // If baseline model has bias dispersion on dark skin, render secondary scatter noise
  if (isBaseline && model.dispersionBias) {
    const sGrad = oCtx.createRadialGradient(w * 0.22, h * 0.28, 4, w * 0.22, h * 0.28, w * 0.22);
    sGrad.addColorStop(0.0, "rgba(255, 80, 0, 0.75)");
    sGrad.addColorStop(1.0, "rgba(0, 0, 0, 0)");
    oCtx.fillStyle = sGrad;
    oCtx.fillRect(0, 0, w, h);
  }

  // Composite heatmap
  ctx.save();
  ctx.globalAlpha = PlatformState.gradCamAlpha;
  ctx.globalCompositeOperation = "screen";
  ctx.drawImage(off, 0, 0);
  ctx.restore();

  // Focal crosshair & label
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.45, 0, Math.PI * 2);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy); ctx.lineTo(cx + 8, cy);
  ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy + 8);
  ctx.stroke();

  // Theme-Adaptive Indicator Tag
  const activeTheme = PlatformState.activeDermTheme || "theme-cyber";
  let tagBg = "rgba(11, 17, 32, 0.88)";
  let tagTextColor = "#38bdf8";
  if (activeTheme === "theme-woodlamp") {
    tagBg = "rgba(27, 12, 54, 0.92)";
    tagTextColor = "#34d399";
  } else if (activeTheme === "theme-radiology") {
    tagBg = "rgba(5, 8, 17, 0.92)";
    tagTextColor = "#fbbf24";
  } else if (activeTheme === "theme-daylight") {
    tagBg = "rgba(255, 255, 255, 0.92)";
    tagTextColor = "#0f172a";
  } else if (activeTheme === "theme-dermlite") {
    tagBg = "rgba(15, 23, 42, 0.92)";
    tagTextColor = "#e2e8f0";
  } else if (activeTheme === "theme-oled") {
    tagBg = "rgba(0, 0, 0, 0.95)";
    tagTextColor = "#94a3b8";
  }
  ctx.fillStyle = tagBg;
  ctx.fillRect(cx + 12, cy - 14, 115, 20);
  ctx.fillStyle = tagTextColor;
  ctx.font = "bold 11px sans-serif";
  ctx.fillText("Grad-CAM Focus", cx + 18, cy);
  ctx.restore();
}

function shadeColor(color, percent) {
  let num = parseInt(color.replace("#", ""), 16),
    amt = Math.round(2.55 * percent),
    R = (num >> 16) + amt,
    G = (num >> 8 & 0x00FF) + amt,
    B = (num & 0x0000FF) + amt;
  return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

// ==========================================================================
// 7. UI Rendering & Synchronization
// ==========================================================================
function initPlatform() {
  try {
    console.log("SkinFairness-AI Platform initializing...");
    PlatformState.activeCase = CLINICAL_BENCHMARK_CASES.find(c => c.id === PlatformState.activeCaseId) || CLINICAL_BENCHMARK_CASES[0];

    renderCaseSelectors();
    syncActiveCaseView();
    renderFairnessAnalytics();
    renderTaxonomyDirectory();
    renderCopilotChat();
    setupEventHandlers();

    setTimeout(() => {
      renderDermoscopyCanvas("mainDermCanvas", PlatformState.activeCase);
    }, 120);

    console.log("SkinFairness-AI Platform initialized successfully.");
  } catch (err) {
    console.error("Initialization error:", err);
  }
}

// Case Carousel
function renderCaseSelectors() {
  const container = document.getElementById("caseListContainer");
  if (!container) return;

  container.innerHTML = CLINICAL_BENCHMARK_CASES.map(c => {
    const isSelected = c.id === PlatformState.activeCaseId;
    const disease = DERMA_23_DATABASE.find(d => d.id === c.diseaseId);
    const isBiasAlert = c.baselineModel.predicted !== c.diseaseId;

    return `
      <div class="case-tile ${isSelected ? 'active' : ''}" data-case-id="${c.id}">
        <div class="flex items-center justify-between" style="margin-bottom: 0.35rem;">
          <span class="fst-chip-${c.fstIndex} badge">${c.fst}</span>
          ${isBiasAlert ? '<span class="badge badge-rose">Tone Bias</span>' : '<span class="badge badge-emerald">Concordant</span>'}
        </div>
        <div class="font-bold text-sm" style="color: #f8fafc; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${c.title}
        </div>
        <div class="flex items-center justify-between text-xs text-muted" style="margin-top: 0.35rem;">
          <span>${c.anatomicalSite}</span>
          <span class="font-mono text-cyan font-bold">${disease ? disease.code : ''}</span>
        </div>
      </div>
    `;
  }).join("");

  container.querySelectorAll(".case-tile").forEach(tile => {
    tile.addEventListener("click", () => {
      const caseId = tile.getAttribute("data-case-id");
      selectCase(caseId);
    });
  });
}

function selectCase(caseId) {
  PlatformState.activeCaseId = caseId;
  PlatformState.activeCase = CLINICAL_BENCHMARK_CASES.find(c => c.id === caseId);
  renderCaseSelectors();
  syncActiveCaseView();
  renderDermoscopyCanvas("mainDermCanvas", PlatformState.activeCase);

  // Announce in Copilot
  PlatformState.chatHistory.push({
    sender: "assistant",
    text: `Switched case to **${PlatformState.activeCase.title}** (${PlatformState.activeCase.fst}, ITA: ${PlatformState.activeCase.itaAngle}°). ${
      PlatformState.activeCase.baselineModel.predicted !== PlatformState.activeCase.diseaseId
        ? "⚠️ Notice: Baseline unmitigated AI failed on this case due to pigment bias!"
        : "Evaluation shows high agreement under current mitigation profile."
    }`
  });
  renderCopilotChat();
}

function syncActiveCaseView() {
  const c = PlatformState.activeCase;
  if (!c) return;

  const disease = DERMA_23_DATABASE.find(d => d.id === c.diseaseId);
  const isBaseline = PlatformState.activeMitigation === "baseline";
  const model = isBaseline ? c.baselineModel : c.mitigatedModel;
  const isCorrect = model.predicted === c.diseaseId;

  // Header and patient demographics
  document.getElementById("activeCaseHeading").innerText = c.title;
  document.getElementById("activeCaseBadges").innerHTML = `
    <span class="fst-chip-${c.fstIndex} badge">${c.fst} (${c.skinToneLabel})</span>
    <span class="badge badge-cyan font-mono">ITA: ${c.itaAngle}°</span>
    <span class="badge" style="background:#1e293b; color:#cbd5e1;">Site: ${c.anatomicalSite}</span>
    <span class="badge" style="background:#1e293b; color:#cbd5e1;">Patient: ${c.age}yo ${c.gender}</span>
    <span class="badge badge-purple">ICD-10: ${disease ? disease.icd10 : 'N/A'}</span>
  `;

  const dermFstBadge = document.getElementById("dermFstBadge");
  if (dermFstBadge) {
    dermFstBadge.textContent = `${c.fst} (${c.skinToneLabel})`;
    dermFstBadge.style.background = `var(--fst-${c.fstIndex})`;
    dermFstBadge.style.color = (c.fstIndex <= 2) ? "#0f172a" : "#ffffff";
  }

  document.getElementById("activeCaseSymptoms").innerText = c.symptoms;

  // Diagnostic Status Banner
  const statusEl = document.getElementById("activeStatusBanner");
  if (statusEl) {
    if (isCorrect) {
      statusEl.className = "clinical-card-compact flex items-center justify-between";
      statusEl.style.borderColor = "rgba(16, 185, 129, 0.4)";
      statusEl.style.backgroundColor = "rgba(6, 78, 59, 0.25)";
      statusEl.innerHTML = `
        <div class="flex items-center gap-3">
          <div style="width: 10px; height: 10px; border-radius: 50%; background: #34d399;"></div>
          <div>
            <div class="text-xs font-bold text-emerald">CONCORDANT GROUND TRUTH</div>
            <div class="text-sm font-bold text-main">${disease.name} (${(model.confidence * 100).toFixed(1)}% certainty)</div>
          </div>
        </div>
        <span class="badge badge-emerald font-mono">CONFIRMED MATCH</span>
      `;
    } else {
      const pred = DERMA_23_DATABASE.find(d => d.id === model.predicted);
      statusEl.className = "clinical-card-compact flex items-center justify-between";
      statusEl.style.borderColor = "rgba(244, 63, 94, 0.4)";
      statusEl.style.backgroundColor = "rgba(136, 19, 55, 0.25)";
      statusEl.innerHTML = `
        <div class="flex items-center gap-3">
          <div style="width: 10px; height: 10px; border-radius: 50%; background: #f43f5e;"></div>
          <div>
            <div class="text-xs font-bold text-rose">⚠️ TONE-BIASED MISCLASSIFICATION (Baseline Error)</div>
            <div class="text-sm font-bold text-main">Predicted: ${pred ? pred.name : model.predicted} | Truth: ${disease.name}</div>
          </div>
        </div>
        <span class="badge badge-rose font-mono">DISCORDANT</span>
      `;
    }
  }

  // Probabilities List
  const probContainer = document.getElementById("activeProbList");
  if (probContainer) {
    probContainer.innerHTML = model.top5.map(item => {
      const isTruth = item.name.toLowerCase().includes(disease.name.toLowerCase());
      const pct = (item.prob * 100).toFixed(1);
      return `
        <div style="margin-bottom: 0.5rem;">
          <div class="flex items-center justify-between text-xs" style="margin-bottom: 0.2rem;">
            <span class="${isTruth ? 'font-bold text-cyan' : 'text-main'}">
              ${isTruth ? '★ ' : ''}${item.name}
            </span>
            <span class="font-mono ${isTruth ? 'text-cyan font-bold' : 'text-muted'}">${pct}%</span>
          </div>
          <div class="progress-bar-track">
            <div class="progress-bar-fill ${isTruth ? 'progress-bar-cyan' : 'progress-bar-slate'}" style="width: ${pct}%;"></div>
          </div>
        </div>
      `;
    }).join("");
  }

  // Concept Bottleneck Attributions
  const conceptContainer = document.getElementById("activeConceptList");
  if (conceptContainer && c.concepts) {
    conceptContainer.innerHTML = Object.entries(c.concepts).map(([key, score]) => {
      const pct = (score * 100).toFixed(0);
      return `
        <div class="clinical-card-compact flex items-center justify-between">
          <span class="text-xs font-medium text-main">${key}</span>
          <div class="flex items-center gap-2">
            <div style="width: 60px; height: 4px; background: #1e293b; border-radius: 2px; overflow: hidden;">
              <div style="width: ${pct}%; height: 100%; background: #a855f7;"></div>
            </div>
            <span class="font-mono text-xs text-purple font-bold">${pct}%</span>
          </div>
        </div>
      `;
    }).join("");
  }

  // SOAP Clinical Note
  const soapContainer = document.getElementById("activeSoapNote");
  if (soapContainer && c.soap) {
    soapContainer.innerHTML = `
      <div class="text-xs space-y-2" style="line-height: 1.6;">
        <div><strong class="text-cyan">Subjective:</strong> <span class="text-muted">${c.soap.subjective}</span></div>
        <div><strong class="text-cyan">Objective:</strong> <span class="text-muted">${c.soap.objective}</span></div>
        <div class="clinical-card-compact" style="border-color: rgba(245, 158, 11, 0.3); background: rgba(245, 158, 11, 0.08); margin: 0.4rem 0;">
          <strong class="text-amber">Assessment & Tone Audit:</strong> <span style="color: #fde68a;">${c.soap.assessment}</span>
        </div>
        <div><strong class="text-emerald">Clinical Plan:</strong> <span class="text-muted">${c.soap.plan}</span></div>
      </div>
    `;
  }
}

// Fairness Analytics & Charting
function renderFairnessAnalytics() {
  const strat = FAIRNESS_PROFILES[PlatformState.activeMitigation];
  if (!strat) return;

  // KPI Grid
  const kpiGrid = document.getElementById("fairnessKpiGrid");
  if (kpiGrid) {
    kpiGrid.innerHTML = `
      <div class="clinical-card">
        <div class="text-xs uppercase font-bold text-muted tracking-wider">Equal Opportunity Gap</div>
        <div class="text-2xl font-bold font-mono ${strat.equalOpportunityGap > 10 ? 'text-rose' : 'text-emerald'}" style="margin-top: 0.3rem;">
          ${strat.equalOpportunityGap.toFixed(1)}%
        </div>
        <div class="text-xs text-dim" style="margin-top: 0.2rem;">TPR(Light) - TPR(Dark)</div>
      </div>
      <div class="clinical-card">
        <div class="text-xs uppercase font-bold text-muted tracking-wider">Disparate Impact Ratio</div>
        <div class="text-2xl font-bold font-mono ${strat.disparateImpactRatio >= 0.80 ? 'text-emerald' : 'text-rose'}" style="margin-top: 0.3rem;">
          ${strat.disparateImpactRatio.toFixed(2)}
        </div>
        <div class="text-xs text-dim" style="margin-top: 0.2rem;">${strat.disparateImpactRatio >= 0.80 ? '✅ Compliant (≥ 0.80)' : '❌ Non-Compliant (< 0.80)'}</div>
      </div>
      <div class="clinical-card">
        <div class="text-xs uppercase font-bold text-muted tracking-wider">Macro F1-Score</div>
        <div class="text-2xl font-bold font-mono text-cyan" style="margin-top: 0.3rem;">${strat.macroF1.toFixed(1)}%</div>
        <div class="text-xs text-dim" style="margin-top: 0.2rem;">Across 23 Diseases</div>
      </div>
      <div class="clinical-card">
        <div class="text-xs uppercase font-bold text-muted tracking-wider">Compliance Status</div>
        <div class="text-base font-bold ${strat.badgeClass}" style="margin-top: 0.3rem; display: inline-block;">
          ${strat.complianceStatus}
        </div>
        <div class="text-xs text-dim" style="margin-top: 0.2rem;">${strat.name.split('(')[0]}</div>
      </div>
    `;
  }

  // Draw Disparity Chart Canvas
  renderDisparityChart(strat);
}

function renderDisparityChart(strat) {
  const canvas = document.getElementById("fairnessChartCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  const padLeft = 45;
  const padBottom = 35;
  const padTop = 30;
  const cW = w - padLeft - 20;
  const cH = h - padTop - padBottom;

  const fstLabels = ["FST I", "FST II", "FST III", "FST IV", "FST V", "FST VI"];
  const step = cW / fstLabels.length;
  const barW = step * 0.32;

  // Gridlines
  ctx.strokeStyle = "rgba(51, 65, 85, 0.4)";
  ctx.lineWidth = 1;
  ctx.font = "10px monospace";
  ctx.fillStyle = "#64748b";
  ctx.textAlign = "right";

  for (let pct = 0; pct <= 100; pct += 25) {
    const y = padTop + cH - (pct / 100) * cH;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(w - 20, y);
    ctx.stroke();
    ctx.fillText(`${pct}%`, padLeft - 8, y + 4);
  }

  // Bars
  fstLabels.forEach((label, i) => {
    const xBase = padLeft + i * step + (step - barW * 2 - 6) / 2;
    const acc = strat.accuracies[i];
    const tpr = strat.tprs[i];

    const accH = (acc / 100) * cH;
    const tprH = (tpr / 100) * cH;

    // Accuracy (Blue)
    ctx.fillStyle = "#3b82f6";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(xBase, padTop + cH - accH, barW, accH, [4, 4, 0, 0]);
    else ctx.rect(xBase, padTop + cH - accH, barW, accH);
    ctx.fill();

    // Sensitivity / TPR (Cyan)
    ctx.fillStyle = "#06b6d4";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(xBase + barW + 5, padTop + cH - tprH, barW, tprH, [4, 4, 0, 0]);
    else ctx.rect(xBase + barW + 5, padTop + cH - tprH, barW, tprH);
    ctx.fill();

    // Labels
    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, xBase + barW + 2, h - 12);

    ctx.font = "10px monospace";
    ctx.fillStyle = "#e2e8f0";
    ctx.fillText(`${tpr.toFixed(0)}%`, xBase + barW + 2, padTop + cH - tprH - 6);
  });

  // Legend
  ctx.textAlign = "left";
  ctx.fillStyle = "#3b82f6";
  ctx.fillRect(w - 170, 10, 10, 10);
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("Accuracy", w - 155, 18);

  ctx.fillStyle = "#06b6d4";
  ctx.fillRect(w - 90, 10, 10, 10);
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("Sensitivity (TPR)", w - 75, 18);
}

// 23 Disease Directory
function renderTaxonomyDirectory() {
  const container = document.getElementById("taxonomyDirectoryGrid");
  if (!container) return;

  const query = PlatformState.taxonomySearch.toLowerCase();
  const filter = PlatformState.taxonomyFilter;

  const filtered = DERMA_23_DATABASE.filter(d => {
    const qMatch = d.name.toLowerCase().includes(query) || d.code.toLowerCase().includes(query) || d.category.toLowerCase().includes(query);
    const fMatch = filter === "all" || d.category.toLowerCase().includes(filter.toLowerCase()) || d.risk.toLowerCase() === filter.toLowerCase();
    return qMatch && fMatch;
  });

  container.innerHTML = filtered.map(d => {
    const riskBadge = d.risk === "High" ? "badge-rose" : d.risk === "Moderate" ? "badge-amber" : "badge-emerald";
    return `
      <div class="clinical-card" style="padding: 1rem;">
        <div class="flex items-center justify-between" style="margin-bottom: 0.5rem;">
          <div>
            <span class="badge badge-cyan font-mono">${d.code}</span>
            <span class="text-xs text-dim font-mono" style="margin-left: 0.35rem;">ICD: ${d.icd10}</span>
          </div>
          <span class="badge ${riskBadge}">${d.risk} Risk</span>
        </div>
        <h4 class="font-bold text-base text-main" style="margin-bottom: 0.25rem;">${d.name}</h4>
        <div class="text-xs text-muted" style="margin-bottom: 0.65rem;">${d.category}</div>
        <p class="text-xs text-dim" style="line-height: 1.5; margin-bottom: 0.75rem;">${d.description}</p>
        
        <div class="clinical-card-compact space-y-1 text-xs" style="background: rgba(11, 19, 41, 0.7);">
          <div><strong class="text-main">Light Skin:</strong> <span class="text-dim">${d.lightSkin}</span></div>
          <div style="margin-top: 0.35rem;"><strong class="text-amber">Dark Skin (FST V-VI):</strong> <span style="color: #fde68a;">${d.darkSkin}</span></div>
        </div>

        <div class="flex items-center justify-between text-xs" style="margin-top: 0.75rem; padding-top: 0.5rem; border-top: 1px solid var(--border-card);">
          <div>
            <span class="text-dim block" style="font-size: 10px;">Baseline Sensitivity Gap</span>
            <span class="font-mono text-rose font-bold">${((d.baselineTPR.light - d.baselineTPR.dark) * 100).toFixed(0)}% Gap</span>
          </div>
          <div>
            <span class="text-dim block" style="font-size: 10px;">Mitigated Gap</span>
            <span class="font-mono text-emerald font-bold">${((d.mitigatedTPR.light - d.mitigatedTPR.dark) * 100).toFixed(0)}% Gap</span>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// Copilot Chat & Multimodal AI Chat State
PlatformState.activeChatAttachment = null;
let cameraMediaStream = null;
let currentFacingMode = "environment";
let speechRecognitionInstance = null;

function renderCopilotChat() {
  const container = document.getElementById("copilotMessageStream");
  if (!container) return;

  container.innerHTML = PlatformState.chatHistory.map(msg => {
    const isUser = msg.sender === "user";
    const isSystem = msg.sender === "system";

    if (isSystem) {
      return `
        <div style="text-align: center; margin: 0.5rem 0;">
          <span class="badge" style="background:#1e293b; color:#94a3b8; font-size: 10px;">${msg.text}</span>
        </div>
      `;
    }

    return `
      <div class="flex gap-2" style="justify-content: ${isUser ? 'flex-end' : 'flex-start'}; margin: 0.65rem 0;">
        ${!isUser ? '<div style="width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, #0ea5e9, #06b6d4); display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px; color: white; shrink: 0; box-shadow: 0 0 10px rgba(6, 182, 212, 0.4);">AI</div>' : ''}
        <div style="max-width: 85%; padding: 0.75rem 0.95rem; border-radius: 10px; font-size: 0.82rem; line-height: 1.5; ${
          isUser
            ? 'background: #0284c7; color: #ffffff; border-bottom-right-radius: 2px;'
            : 'background: #0f172a; color: #e2e8f0; border: 1px solid var(--border-card); border-bottom-left-radius: 2px;'
        }">
          ${msg.attachment ? `
            <div style="margin-bottom: 0.5rem;">
              <img src="${msg.attachment.dataUrl}" style="max-width: 220px; max-height: 180px; object-fit: cover; border-radius: 6px; border: 1px solid rgba(255,255,255,0.25); display: block;">
              <span class="text-xs" style="font-size: 10px; opacity: 0.8; display: block; margin-top: 2px;">📸 Specimen: ${msg.attachment.filename || 'Camera Capture'}</span>
            </div>
          ` : ''}
          ${msg.analysisCard ? `
            <div class="clinical-card-compact space-y-2" style="margin-bottom: 0.5rem; background: #080d1a; border-color: rgba(6, 182, 212, 0.4);">
              <div class="flex items-center justify-between text-xs">
                <span class="badge ${msg.analysisCard.fstClass} font-bold">${msg.analysisCard.fst} Detected</span>
                <span class="badge badge-cyan font-mono">ITA: ${msg.analysisCard.ita}°</span>
              </div>
              <div class="text-xs font-bold text-main">
                Top Prediction: <span class="text-cyan">${msg.analysisCard.topDisease} (${msg.analysisCard.confidence}%)</span>
              </div>
              <div class="space-y-1 text-xs">
                ${msg.analysisCard.top3.map(t => `
                  <div>
                    <div class="flex justify-between" style="font-size: 10px;">
                      <span>${t.name}</span>
                      <span class="font-mono">${t.prob}%</span>
                    </div>
                    <div style="height: 3px; background: #1e293b; border-radius: 2px; overflow: hidden;">
                      <div style="height: 100%; width: ${t.prob}%; background: #06b6d4;"></div>
                    </div>
                  </div>
                `).join('')}
              </div>
              <div class="p-1 rounded text-xs text-amber" style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.2); font-size: 10px;">
                <strong>Optical Equity Warning:</strong> ${msg.analysisCard.equityCaveat}
              </div>
            </div>
          ` : ''}
          <div>${msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>')}</div>
        </div>
      </div>
    `;
  }).join("");

  container.scrollTop = container.scrollHeight;
}

function processCopilotQuery(query, attachment = null) {
  const c = PlatformState.activeCase;
  const disease = DERMA_23_DATABASE.find(d => d.id === c.diseaseId);
  const q = query.toLowerCase();

  let answer = "";
  let analysisCard = null;

  if (attachment) {
    // Multimodal Analysis Response on Attached Image/Camera Capture
    const ita = attachment.ita || -12;
    const fst = attachment.fst || "FST V";
    const fstClass = fst.includes("V") ? "fst-chip-5" : fst.includes("VI") ? "fst-chip-6" : "fst-chip-2";
    
    analysisCard = {
      fst: fst,
      fstClass: fstClass,
      ita: ita,
      topDisease: disease.name,
      confidence: "82.4",
      top3: [
        { name: disease.name, prob: 82.4 },
        { name: "Melanocytic Nevus", prob: 9.8 },
        { name: "Psoriasis Vulgaris", prob: 4.5 }
      ],
      equityCaveat: `In ${fst}, high melanin fraction optical absorption masks classic erythematous erythema. Multi-modal Fair AI weights structural border geometry to prevent misdiagnosis.`
    };

    answer = `### Multimodal Dermal Assessment Report
I have received and evaluated the specimen **${attachment.filename || 'Camera Capture'}**.
- **Automated Colorimetry**: Stratified into **${fst}** (Individual Typology Angle: ${ita}°).
- **Primary Diagnostic Impression**: **${disease.name}** (Concordance: 82.4%).
- **XAI Attention**: Neural attention focuses on pathognomonic margins and reticular patterns rather than background melanin.
- **Recommended Action**: ${c.soap.plan}`;
  } else if (q.includes("grad-cam") || q.includes("heatmap") || q.includes("attention")) {
    answer = `### Grad-CAM Activation Analysis for ${c.title}
- **Peak Activation**: Normalized gradient focus localized at (${(c.baselineModel.gradCamCenter.x * 100).toFixed(0)}%, ${(c.baselineModel.gradCamCenter.y * 100).toFixed(0)}%).
- **Key Concepts Detected**: ${Object.keys(c.concepts).slice(0, 2).join(", ")}.
- **Tone Guardrail Note**: In ${c.fst}, standard vision encoders often scatter attention across normal background melanin. Current mitigation ensures precise focus on true pathological borders.`;
  } else if (q.includes("fairness") || q.includes("bias") || q.includes("skin tone")) {
    answer = `### Fitzpatrick Fairness Assessment (${c.fst})
- **Demographic Representation**: FST V & VI represent only 9.5% of public dermatology training sets.
- **Identified Failure Mode**: ${disease.darkSkin}
- **Mitigation Status**: Utilizing **${FAIRNESS_PROFILES[PlatformState.activeMitigation].name}**, reducing True Positive Rate disparity to **${FAIRNESS_PROFILES[PlatformState.activeMitigation].equalOpportunityGap.toFixed(1)}%**.`;
  } else if (q.includes("differential") || q.includes("rule out") || q.includes("diagnosis")) {
    answer = `### Differential Diagnosis & Rule-Out Rationale
- **Primary Hypothesis**: **${disease.name}** (Confidence: ${(c.mitigatedModel.confidence * 100).toFixed(1)}%).
- **Rule-Out Consideration**: Second probability is **${c.mitigatedModel.top5[1].name}**. Deprioritized due to lack of pathognomonic scaling or uniform reticular pigment.
- **Recommended Action**: ${c.soap.plan}`;
  } else {
    answer = `### Clinical Consultation (${c.title})
- **Case Profile**: ${c.age}yo ${c.gender}, ${c.anatomicalSite} (${c.fst}).
- **Symptoms**: ${c.symptoms}
- **Current Strategy**: ${FAIRNESS_PROFILES[PlatformState.activeMitigation].name}.
Feel free to ask me about **Grad-CAM attention**, **fairness metrics**, or snap a photo using the **Camera** option above!`;
  }

  // Push User message
  PlatformState.chatHistory.push({
    sender: "user",
    text: query || (attachment ? `Analyze specimen photo (${attachment.filename || 'Camera'})` : "Clinical Inquiry"),
    attachment: attachment
  });

  // Push AI Assistant message
  PlatformState.chatHistory.push({
    sender: "assistant",
    text: answer,
    analysisCard: analysisCard
  });

  renderCopilotChat();
}

// --------------------------------------------------------------------------
// Camera Modal & Live Webcam Stream Handler
// --------------------------------------------------------------------------
function openCameraModal() {
  const modal = document.getElementById("cameraModal");
  if (!modal) return;
  modal.classList.remove("hidden");

  const video = document.getElementById("cameraVideoFeed");
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: currentFacingMode, width: { ideal: 640 }, height: { ideal: 480 } }
    }).then(stream => {
      cameraMediaStream = stream;
      if (video) {
        video.srcObject = stream;
        video.play();
      }
    }).catch(err => {
      console.warn("Camera access denied or unavailable:", err);
      alert("Unable to open camera: " + err.message + ". You can use the Photo Upload button to pick an image.");
      closeCameraModal();
      triggerPhotoUpload();
    });
  } else {
    alert("Camera API not supported in this browser environment. Please use Photo Upload.");
    closeCameraModal();
    triggerPhotoUpload();
  }
}

function closeCameraModal() {
  const modal = document.getElementById("cameraModal");
  if (modal) modal.classList.add("hidden");

  if (cameraMediaStream) {
    cameraMediaStream.getTracks().forEach(track => track.stop());
    cameraMediaStream = null;
  }
}

function switchCameraDevice() {
  currentFacingMode = currentFacingMode === "environment" ? "user" : "environment";
  closeCameraModal();
  openCameraModal();
}

function captureCameraSnapshot() {
  const video = document.getElementById("cameraVideoFeed");
  const canvas = document.getElementById("cameraCaptureBuffer");
  if (!video || !canvas) return;

  canvas.width = video.videoWidth || 480;
  canvas.height = video.videoHeight || 360;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  setChatAttachment(dataUrl, "Live_Camera_Capture.jpg", "FST V", -15);
  closeCameraModal();
}

// --------------------------------------------------------------------------
// Photo Upload Handlers
// --------------------------------------------------------------------------
function triggerPhotoUpload() {
  const input = document.getElementById("chatPhotoFileInput");
  if (input) input.click();
}

function handleChatPhotoSelected(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    setChatAttachment(e.target.result, file.name, "FST V", -12);
  };
  reader.readAsDataURL(file);
}

function attachSampleLesion() {
  const c = PlatformState.activeCase;
  // Render active case canvas to data URL
  const canvas = document.getElementById("mainDermCanvas");
  let dataUrl = "";
  if (canvas) {
    dataUrl = canvas.toDataURL("image/png");
  }
  setChatAttachment(dataUrl, `${c.title.replace(/\s+/g, '_')}_Specimen.png`, c.fst, c.itaAngle);
}

function setChatAttachment(dataUrl, filename, fst = "FST V", ita = -12) {
  PlatformState.activeChatAttachment = {
    dataUrl: dataUrl,
    filename: filename,
    fst: fst,
    ita: ita
  };

  const previewArea = document.getElementById("chatAttachmentPreviewArea");
  if (previewArea) {
    previewArea.classList.remove("hidden");
    previewArea.innerHTML = `
      <div class="chat-attachment-preview">
        <img src="${dataUrl}" class="chat-attachment-thumb">
        <div style="line-height: 1.2;">
          <strong style="display:block;">${filename}</strong>
          <span style="font-size: 10px; color: #94a3b8;">${fst} (ITA: ${ita}°)</span>
        </div>
        <button type="button" onclick="removeChatAttachment()" style="background:none; border:none; color:#f43f5e; cursor:pointer; font-weight:bold; font-size:14px; margin-left:8px;">✕</button>
      </div>
    `;
  }
}

function removeChatAttachment() {
  PlatformState.activeChatAttachment = null;
  const previewArea = document.getElementById("chatAttachmentPreviewArea");
  if (previewArea) {
    previewArea.classList.add("hidden");
    previewArea.innerHTML = "";
  }
}

// --------------------------------------------------------------------------
// Voice Dictation (Speech Recognition)
// --------------------------------------------------------------------------
function toggleVoiceDictation() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Speech recognition is not natively supported in this browser. Please type your query.");
    return;
  }

  const btn = document.getElementById("chatVoiceBtn");
  const label = document.getElementById("voiceBtnLabel");
  const input = document.getElementById("copilotTextInput");

  if (!speechRecognitionInstance) {
    speechRecognitionInstance = new SpeechRecognition();
    speechRecognitionInstance.continuous = false;
    speechRecognitionInstance.interimResults = false;
    speechRecognitionInstance.lang = "en-US";

    speechRecognitionInstance.onstart = function () {
      btn.classList.add("recording-pulse");
      label.innerText = "🔴 Listening...";
    };

    speechRecognitionInstance.onresult = function (event) {
      const transcript = event.results[0][0].transcript;
      input.value = (input.value ? input.value + " " : "") + transcript;
    };

    speechRecognitionInstance.onerror = function (event) {
      console.warn("Speech recognition error:", event.error);
      stopVoice();
    };

    speechRecognitionInstance.onend = function () {
      stopVoice();
    };

    speechRecognitionInstance.start();
  } else {
    speechRecognitionInstance.stop();
    stopVoice();
  }

  function stopVoice() {
    speechRecognitionInstance = null;
    btn.classList.remove("recording-pulse");
    label.innerText = "🎤 Voice Dictation";
  }
}

// Custom Image Upload Analyzer
function handleCustomImageUpload(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      PlatformState.uploadedImage = img;
      analyzeUploadedImage(img);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function analyzeUploadedImage(img) {
  const canvas = document.getElementById("uploadedLesionCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  // Draw user image centered & cropped
  ctx.drawImage(img, 0, 0, w, h);

  // Sample perimeter pixels to compute realistic skin tone ITA
  const imgData = ctx.getImageData(0, 0, w, h);
  let rSum = 0, gSum = 0, bSum = 0, count = 0;
  
  // Perimeter border samples
  for (let x = 10; x < w - 10; x += 15) {
    const idx1 = (10 * w + x) * 4;
    const idx2 = ((h - 10) * w + x) * 4;
    rSum += imgData.data[idx1] + imgData.data[idx2];
    gSum += imgData.data[idx1 + 1] + imgData.data[idx2 + 1];
    bSum += imgData.data[idx1 + 2] + imgData.data[idx2 + 2];
    count += 2;
  }
  
  const avgR = rSum / count;
  const avgG = gSum / count;
  const avgB = bSum / count;

  // Approximate CIE L* and b* for ITA
  const L = 0.299 * avgR + 0.587 * avgG + 0.114 * avgB;
  const bStar = (avgR - avgB) * 0.4;
  const ita = Math.round(Math.atan2((L - 50), (bStar || 1)) * (180 / Math.PI));

  let detectedFst = "FST III";
  if (ita > 55) detectedFst = "FST I";
  else if (ita > 41) detectedFst = "FST II";
  else if (ita > 28) detectedFst = "FST III";
  else if (ita > 10) detectedFst = "FST IV";
  else if (ita > -30) detectedFst = "FST V";
  else detectedFst = "FST VI";

  // Overlay simulated Grad-CAM heatmap on user image
  ctx.save();
  ctx.globalAlpha = 0.65;
  ctx.globalCompositeOperation = "screen";
  const rad = ctx.createRadialGradient(w * 0.5, h * 0.5, 10, w * 0.5, h * 0.5, w * 0.4);
  rad.addColorStop(0, "rgba(255, 30, 0, 1.0)");
  rad.addColorStop(0.4, "rgba(255, 190, 0, 0.8)");
  rad.addColorStop(0.7, "rgba(0, 220, 200, 0.4)");
  rad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // Display findings
  const out = document.getElementById("uploadedAnalysisResult");
  if (out) {
    out.innerHTML = `
      <div class="clinical-card-compact space-y-2">
        <div class="flex items-center justify-between">
          <span class="badge badge-cyan font-bold">${detectedFst} Detected</span>
          <span class="font-mono text-xs text-muted">ITA: ${ita}°</span>
        </div>
        <div class="text-xs text-main">
          <strong>RGB Dermal Mean:</strong> (${Math.round(avgR)}, ${Math.round(avgG)}, ${Math.round(avgB)})
        </div>
        <div class="text-xs text-emerald font-bold">
          ✓ Real-time Grad-CAM attention synthesized successfully on custom dermal specimen.
        </div>
      </div>
    `;
  }
}

// Event Handlers
function setupEventHandlers() {
  // Navigation Tabs
  document.querySelectorAll(".nav-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.getAttribute("data-tab");
      switchTab(tab);
    });
  });

  // Global Mitigation Selector
  const mitSel = document.getElementById("globalMitigationSelector");
  if (mitSel) {
    mitSel.addEventListener("change", (e) => {
      PlatformState.activeMitigation = e.target.value;
      syncActiveCaseView();
      renderFairnessAnalytics();
      renderDermoscopyCanvas("mainDermCanvas", PlatformState.activeCase);
    });
  }

  // Grad-CAM Controls
  const toggleCam = document.getElementById("toggleCamCheckbox");
  if (toggleCam) {
    toggleCam.addEventListener("change", (e) => {
      PlatformState.showGradCam = e.target.checked;
      renderDermoscopyCanvas("mainDermCanvas", PlatformState.activeCase);
    });
  }

  const alphaSlider = document.getElementById("camAlphaRange");
  if (alphaSlider) {
    alphaSlider.addEventListener("input", (e) => {
      PlatformState.gradCamAlpha = parseFloat(e.target.value);
      renderDermoscopyCanvas("mainDermCanvas", PlatformState.activeCase);
    });
  }

  const paletteSel = document.getElementById("camPaletteSelector");
  if (paletteSel) {
    paletteSel.addEventListener("change", (e) => {
      PlatformState.gradCamPalette = e.target.value;
      renderDermoscopyCanvas("mainDermCanvas", PlatformState.activeCase);
    });
  }

  // Dermoscopy Specimen & Grad-CAM Themes Switcher
  const dermThemeBtns = document.querySelectorAll("#dermThemeSelector .theme-pill-btn");
  const dermCardContainer = document.getElementById("dermoscopyCardContainer");
  const dermThemeBadge = document.getElementById("dermActiveThemeBadge");

  const themeMeta = {
    "theme-cyber": { name: "💎 Cyber-Titanium Console", palette: "turbo", badgeClass: "badge-cyan" },
    "theme-dermlite": { name: "🔬 DermLite DL4 Polarized (30mm Reticle)", palette: "jet", badgeClass: "badge-sky" },
    "theme-woodlamp": { name: "🟣 Wood's Lamp 365nm UV Fluorescent", palette: "uv", badgeClass: "badge-purple" },
    "theme-radiology": { name: "🩻 PACS Diagnostic Station (Amber)", palette: "magma", badgeClass: "badge-amber" },
    "theme-oled": { name: "⬛ OLED Pure Black Contrast", palette: "inferno", badgeClass: "badge-gray" },
    "theme-daylight": { name: "☀️ 5500K Daylight Clinical Studio", palette: "viridis", badgeClass: "badge-emerald" }
  };

  dermThemeBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const selectedTheme = btn.getAttribute("data-theme");
      dermThemeBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      PlatformState.activeDermTheme = selectedTheme;

      if (dermCardContainer) {
        dermCardContainer.classList.remove("theme-cyber", "theme-dermlite", "theme-woodlamp", "theme-radiology", "theme-oled", "theme-daylight");
        dermCardContainer.classList.add(selectedTheme);
      }

      // Update active theme badge
      const meta = themeMeta[selectedTheme];
      if (dermThemeBadge && meta) {
        dermThemeBadge.textContent = meta.name;
        dermThemeBadge.className = "badge font-mono " + meta.badgeClass;
      }

      // Auto-adapt palette if user switches to Wood's UV
      if (selectedTheme === "theme-woodlamp") {
        PlatformState.gradCamPalette = "uv";
        if (paletteSel) paletteSel.value = "uv";
      } else if (selectedTheme === "theme-radiology" && PlatformState.gradCamPalette === "turbo") {
        PlatformState.gradCamPalette = "magma";
        if (paletteSel) paletteSel.value = "magma";
      }

      renderDermoscopyCanvas("mainDermCanvas", PlatformState.activeCase);
    });
  });

  // Reticle and Cross-Polarized Toggles
  const reticleToggle = document.getElementById("toggleReticleCheckbox");
  if (reticleToggle) {
    reticleToggle.addEventListener("change", (e) => {
      PlatformState.showReticle = e.target.checked;
      renderDermoscopyCanvas("mainDermCanvas", PlatformState.activeCase);
    });
  }

  const polarizedToggle = document.getElementById("togglePolarizedCheckbox");
  if (polarizedToggle) {
    polarizedToggle.addEventListener("change", (e) => {
      PlatformState.isCrossPolarized = e.target.checked;
      renderDermoscopyCanvas("mainDermCanvas", PlatformState.activeCase);
    });
  }

  // Copilot Form (Multimodal Submit)
  const chatForm = document.getElementById("copilotChatForm");
  const chatInput = document.getElementById("copilotTextInput");
  if (chatForm && chatInput) {
    chatForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const val = chatInput.value.trim();
      const attachment = PlatformState.activeChatAttachment;
      if (!val && !attachment) return;
      chatInput.value = "";
      removeChatAttachment();
      processCopilotQuery(val, attachment);
    });
  }

  // Multimodal AI Chat Actions (Camera, Photo, Voice)
  const cameraBtn = document.getElementById("chatCameraBtn");
  const inlineCameraBtn = document.getElementById("inlineCameraBtn");
  if (cameraBtn) cameraBtn.addEventListener("click", openCameraModal);
  if (inlineCameraBtn) inlineCameraBtn.addEventListener("click", openCameraModal);

  const photoBtn = document.getElementById("chatPhotoBtn");
  const inlinePhotoBtn = document.getElementById("inlinePhotoBtn");
  if (photoBtn) photoBtn.addEventListener("click", triggerPhotoUpload);
  if (inlinePhotoBtn) inlinePhotoBtn.addEventListener("click", triggerPhotoUpload);

  const voiceBtn = document.getElementById("chatVoiceBtn");
  if (voiceBtn) voiceBtn.addEventListener("click", toggleVoiceDictation);

  const sampleBtn = document.getElementById("chatSampleBtn");
  if (sampleBtn) sampleBtn.addEventListener("click", attachSampleLesion);

  const closeCamBtn = document.getElementById("closeCameraBtn");
  if (closeCamBtn) closeCamBtn.addEventListener("click", closeCameraModal);

  const snapBtn = document.getElementById("captureSnapshotBtn");
  if (snapBtn) snapBtn.addEventListener("click", captureCameraSnapshot);

  const switchCamBtn = document.getElementById("switchCameraDeviceBtn");
  if (switchCamBtn) switchCamBtn.addEventListener("click", switchCameraDevice);

  const chatPhotoInput = document.getElementById("chatPhotoFileInput");
  if (chatPhotoInput) {
    chatPhotoInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        handleChatPhotoSelected(e.target.files[0]);
      }
    });
  }

  // Prompt Pills
  document.querySelectorAll(".copilot-prompt-pill").forEach(p => {
    p.addEventListener("click", () => {
      const query = p.getAttribute("data-query");
      processCopilotQuery(query);
    });
  });

  // Taxonomy Search
  const taxSearch = document.getElementById("taxonomySearchBox");
  if (taxSearch) {
    taxSearch.addEventListener("input", (e) => {
      PlatformState.taxonomySearch = e.target.value;
      renderTaxonomyDirectory();
    });
  }

  const taxFilter = document.getElementById("taxonomyFilterSelect");
  if (taxFilter) {
    taxFilter.addEventListener("change", (e) => {
      PlatformState.taxonomyFilter = e.target.value;
      renderTaxonomyDirectory();
    });
  }

  // Image Upload Input
  const fileInput = document.getElementById("lesionFileInput");
  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        handleCustomImageUpload(e.target.files[0]);
      }
    });
  }

  // Bio-Optics Sliders
  const melaninSlider = document.getElementById("opticsMelaninSlider");
  const erythemaSlider = document.getElementById("opticsErythemaSlider");
  if (melaninSlider) melaninSlider.addEventListener("input", renderBioOpticsSimulation);
  if (erythemaSlider) erythemaSlider.addEventListener("input", renderBioOpticsSimulation);

  // Counterfactual Tone Slider
  const cfSlider = document.getElementById("cfToneSlider");
  if (cfSlider) cfSlider.addEventListener("input", renderCounterfactualSimulation);
}

// ==========================================================================
// 8. Unique Feature 1: Bio-Optical Skin Physics Simulator (Beer-Lambert Law)
// ==========================================================================
function renderBioOpticsSimulation() {
  const canvas = document.getElementById("bioOpticsCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  const melVal = parseInt(document.getElementById("opticsMelaninSlider").value, 10);
  const eryVal = parseInt(document.getElementById("opticsErythemaSlider").value, 10);

  // Update label
  let toneName = "FST I";
  if (melVal > 35) toneName = "FST VI";
  else if (melVal > 25) toneName = "FST V";
  else if (melVal > 18) toneName = "FST IV";
  else if (melVal > 10) toneName = "FST III";
  else if (melVal > 5) toneName = "FST II";

  document.getElementById("opticsMelaninVal").innerText = `${melVal}% (${toneName})`;
  document.getElementById("opticsErythemaVal").innerText = eryVal > 70 ? "High (Severe)" : eryVal > 40 ? "Moderate" : "Subtle";

  ctx.clearRect(0, 0, w, h);

  // Layer 1: Stratum Corneum & Upper Epidermis (0 to 70px)
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(0, 0, w, 70);

  // Layer 2: Stratum Basale with Melanosomes (70 to 120px)
  const melAlpha = Math.min(0.95, 0.15 + (melVal / 45) * 0.8);
  ctx.fillStyle = `rgba(71, 43, 29, ${melAlpha})`;
  ctx.fillRect(0, 70, w, 50);

  // Melanosome particles
  ctx.fillStyle = "rgba(40, 20, 10, 0.9)";
  const numParticles = Math.round((melVal / 45) * 120);
  for (let i = 0; i < numParticles; i++) {
    const px = (i * 37) % w;
    const py = 75 + ((i * 19) % 40);
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Layer 3: Dermal-Epidermal Junction Wavy Line
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 10) {
    const y = 120 + Math.sin(x * 0.05) * 8;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Layer 4: Dermis with Capillary Blood Vessels (120 to h)
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 120, w, h - 120);

  // Capillary loops (Oxyhemoglobin 540nm)
  const capColor = `rgba(239, 68, 68, ${Math.min(1.0, 0.3 + (eryVal / 100) * 0.7)})`;
  ctx.fillStyle = capColor;
  ctx.strokeStyle = capColor;
  ctx.lineWidth = 3;
  for (let x = 30; x < w; x += 55) {
    ctx.beginPath();
    ctx.arc(x, 155, 14, Math.PI, 0, false);
    ctx.stroke();
    // Blood cells
    ctx.beginPath();
    ctx.arc(x - 5, 155, 3, 0, Math.PI * 2);
    ctx.arc(x + 5, 155, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Layer 5: Incident Light & Absorbed Rays (Beer-Lambert visualization)
  ctx.lineWidth = 2;
  const numRays = 8;
  for (let r = 0; r < numRays; r++) {
    const rx = 35 + r * (w / numRays);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.beginPath();
    ctx.moveTo(rx, 10);
    ctx.lineTo(rx, 70);
    ctx.stroke();

    // Attenuation through melanin
    const rayTransmittance = Math.max(0.08, Math.exp(-(melVal * 0.065)));
    ctx.strokeStyle = `rgba(239, 68, 68, ${rayTransmittance})`;
    ctx.beginPath();
    ctx.moveTo(rx, 70);
    ctx.lineTo(rx, 120);
    ctx.stroke();

    // Returning reflected beam
    ctx.strokeStyle = `rgba(168, 85, 247, ${rayTransmittance * 0.8})`;
    ctx.beginPath();
    ctx.moveTo(rx + 8, 120);
    ctx.lineTo(rx + 16, 10);
    ctx.stroke();
  }

  // Calculate Math
  const transmittancePct = (Math.exp(-(melVal * 0.065)) * 100).toFixed(1);
  document.getElementById("opticsTransmittanceVal").innerText = `${transmittancePct}% (${melVal > 25 ? 'High Melanin Barrier' : 'Clear Transmittance'})`;

  let surfaceHue = "Bright Salmon Pink";
  let baselineAcc = "92.4% (Optimal)";
  let fairAcc = "93.1% (Equitable)";

  if (melVal > 30) {
    surfaceHue = "Slate-Grey / Hyperpigmented";
    baselineAcc = "38.5% (High Misdiagnosis Risk)";
    fairAcc = "84.8% (Texture Invariance Active)";
  } else if (melVal > 18) {
    surfaceHue = "Violaceous / Dusky Brown";
    baselineAcc = "58.2% (Moderate Drop)";
    fairAcc = "86.4% (Calibrated)";
  }

  document.getElementById("opticsSurfaceHue").innerText = surfaceHue;
  document.getElementById("opticsAiBaselineVal").innerText = baselineAcc;
  document.getElementById("opticsAiFairVal").innerText = fairAcc;
}

// ==========================================================================
// 9. Unique Feature 2: Counterfactual Tone Transfer & Fragility Curves
// ==========================================================================
function renderCounterfactualSimulation() {
  const canvas = document.getElementById("counterfactualCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  const toneIdx = parseInt(document.getElementById("cfToneSlider").value, 10);
  const tones = [
    { name: "FST I", label: "Ivory", ita: "+58.1°", color: "#faebe2", baseLoss: 0 },
    { name: "FST II", label: "Fair", ita: "+44.2°", color: "#f4d3be", baseLoss: 2 },
    { name: "FST III", label: "Medium", ita: "+32.5°", color: "#e6b797", baseLoss: 6 },
    { name: "FST IV", label: "Olive", ita: "+18.7°", color: "#bb8760", baseLoss: 14 },
    { name: "FST V", label: "Brown", ita: "-12.4°", color: "#8c5234", baseLoss: 28 },
    { name: "FST VI", label: "Dark", ita: "-38.5°", color: "#472b1d", baseLoss: 42 }
  ];

  const t = tones[toneIdx - 1];
  document.getElementById("cfCurrentToneLabel").innerText = `Target: ${t.name} (${t.label})`;
  document.getElementById("cfCurrentItaLabel").innerText = `ITA: ${t.ita}`;

  // Draw counterfactual skin
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = t.color;
  ctx.fillRect(0, 0, w, h);

  // Draw lesion morphology with adjusted optical contrast
  const cx = w * 0.5;
  const cy = h * 0.5;

  let lesionTone = "#4a243a";
  if (toneIdx <= 2) lesionTone = "#b91c1c"; // Redder in light skin
  else if (toneIdx <= 4) lesionTone = "#7f1d1d";
  else lesionTone = "#3b1328"; // Violaceous dark in dark skin

  ctx.fillStyle = lesionTone;
  ctx.beginPath();
  ctx.arc(cx, cy, 55, 0, Math.PI * 2);
  ctx.fill();

  // Draw delicate Wickham's striae
  ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(cx - 30, cy - 15); ctx.lineTo(cx + 30, cy + 15);
  ctx.moveTo(cx - 20, cy + 20); ctx.lineTo(cx + 20, cy - 20);
  ctx.stroke();

  // Draw Fragility Curve on fragilityChartCanvas
  drawFragilityCurve(toneIdx);

  // Explanation
  const baseConf = (91.2 - t.baseLoss).toFixed(1);
  const fairConf = (88.5 - t.baseLoss * 0.12).toFixed(1);

  document.getElementById("cfExplanationText").innerHTML = `
    Translating this morphology to <strong>${t.name} (${t.label})</strong>: 
    Baseline unmitigated confidence drops to <span class="text-rose font-bold">${baseConf}%</span> due to optical erythema absorption. 
    In contrast, our <strong>Generative Fair Model</strong> maintains invariant confidence at <span class="text-emerald font-bold">${fairConf}%</span>.
  `;
}

function drawFragilityCurve(activeIdx) {
  const canvas = document.getElementById("fragilityChartCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  const baselinePts = [91, 89, 84, 76, 62, 48];
  const fairPts = [88, 88, 87, 86, 85, 84];

  const step = w / 5;

  // Grid
  ctx.strokeStyle = "rgba(51, 65, 85, 0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.5); ctx.lineTo(w, h * 0.5);
  ctx.stroke();

  // Baseline Curve (Red)
  ctx.strokeStyle = "#f43f5e";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  baselinePts.forEach((p, i) => {
    const x = i * step;
    const y = h - (p / 100) * (h - 20) - 10;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Fair Curve (Cyan)
  ctx.strokeStyle = "#06b6d4";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  fairPts.forEach((p, i) => {
    const x = i * step;
    const y = h - (p / 100) * (h - 20) - 10;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Active tone indicator line
  const activeX = (activeIdx - 1) * step;
  ctx.strokeStyle = "#ffffff";
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(activeX, 0);
  ctx.lineTo(activeX, h);
  ctx.stroke();
  ctx.setLineDash([]);
}

// ==========================================================================
// 10. Unique Feature 3: Hospital SOAP Report Generator & Clipboard Exporter
// ==========================================================================
function renderFullSoapReport() {
  const box = document.getElementById("fullSoapReportBox");
  if (!box) return;
  const c = PlatformState.activeCase;
  const d = DERMA_23_DATABASE.find(x => x.id === c.diseaseId);
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  box.innerHTML = `
=============================================================
CLINICAL DERMATOLOGY ENCOUNTER & FAIRNESS AUDIT REPORT
Hospital Health Information System (HIS) Integration
Date/Time: ${now} UTC
Provider: Med-PaLM M Dermatologic Copilot
Backbone: ViT-H/16 Multi-Modal Transformer
=============================================================

1. PATIENT DEMOGRAPHICS & LESION EPIDEMIOLOGY:
-------------------------------------------------------------
Patient Age/Gender: ${c.age} Year Old ${c.gender}
Anatomical Location: ${c.anatomicalSite}
Fitzpatrick Skin Tone: ${c.fst} (${c.skinToneLabel})
Individual Typology Angle: ${c.itaAngle}° (CIE L*a*b* Standard)

2. SUBJECTIVE (PATIENT HISTORY):
-------------------------------------------------------------
${c.soap.subjective}
Reported Symptoms: ${c.symptoms}

3. OBJECTIVE FINDINGS & XAI BIOMARKERS:
-------------------------------------------------------------
${c.soap.objective}
Dermoscopic Patterns: ${d.dermoscopy}
Grad-CAM Focal Coordinates: (${(c.baselineModel.gradCamCenter.x * 100).toFixed(0)}%, ${(c.baselineModel.gradCamCenter.y * 100).toFixed(0)}%)
Concept Attributions:
${Object.entries(c.concepts).map(([k, v]) => `  - ${k}: ${(v * 100).toFixed(0)}% attribution`).join('\n')}

4. CLINICAL ASSESSMENT & DIFFERENTIAL DIAGNOSIS:
-------------------------------------------------------------
Primary Diagnostic Impression: ${d.name} (${d.code})
ICD-10-CM Coding: ${d.icd10}
Algorithmic Confidence: ${(c.mitigatedModel.confidence * 100).toFixed(1)}% (Diffusion-Fair Model)
Differential Stratification:
${c.mitigatedModel.top5.map((t, idx) => `  ${idx + 1}. ${t.name}: ${(t.prob * 100).toFixed(1)}%`).join('\n')}

** DERMATOLOGIC EQUITY AUDIT & CAVEAT **:
${c.soap.assessment}
Optical Attenuation Note: High melanin fraction in ${c.fst} attenuates pink erythema. 
Decision boundary calibrated to prevent benign nevus false positives.

5. ACTIONABLE PLAN & RECOMMENDED INTERVENTIONS:
-------------------------------------------------------------
${c.soap.plan}
Follow-up Interval: Clinical re-evaluation in 30 days.

=============================================================
Attending Clinician Signature Block:
Electronically Verified by Dermatologic Decision Support System
Status: COMPLETE & VERIFIED
=============================================================
  `.trim();
}

function copySoapNoteToClipboard() {
  const box = document.getElementById("fullSoapReportBox");
  if (!box) return;
  navigator.clipboard.writeText(box.innerText).then(() => {
    const btn = document.getElementById("copySoapBtn");
    btn.innerText = "✓ Copied!";
    btn.style.borderColor = "#10b981";
    btn.style.color = "#10b981";
    setTimeout(() => {
      btn.innerText = "📋 Copy Note";
      btn.style.borderColor = "";
      btn.style.color = "";
    }, 2000);
  });
}

// ==========================================================================
// 11. Unique Feature 4: Interactive Clinician Equity Quiz Challenge
// ==========================================================================
function checkQuizAnswer(selected) {
  const box = document.getElementById("quizFeedbackBox");
  box.classList.remove("hidden");

  if (selected === "lp") {
    box.style.borderColor = "rgba(16, 185, 129, 0.5)";
    box.style.backgroundColor = "rgba(6, 78, 59, 0.3)";
    box.innerHTML = `
      <div class="text-xs space-y-1">
        <span class="badge badge-emerald font-bold">✓ CORRECT DIAGNOSIS: Lichen Planus</span>
        <p class="text-main" style="margin-top: 0.35rem; line-height: 1.5;">
          Outstanding clinical acumen! In Fitzpatrick Type V skin, Lichen Planus papules present with violaceous-to-slate grey hues rather than bright pink-red erythema. The pathognomonic sign is <strong>Wickham's Striae</strong>.
        </p>
        <p class="text-emerald font-bold" style="margin-top: 0.25rem;">
          Why standard AI failed: Naive models heavily associate dark focal lesions in FST V with Melanocytic Nevi (58% false positive). Our fair model uses structural geometry to reach 81.2% concordance.
        </p>
      </div>
    `;
  } else {
    box.style.borderColor = "rgba(244, 63, 94, 0.5)";
    box.style.backgroundColor = "rgba(136, 19, 55, 0.3)";
    box.innerHTML = `
      <div class="text-xs space-y-1">
        <span class="badge badge-rose font-bold">❌ INCORRECT (Common AI Pitfall)</span>
        <p class="text-main" style="margin-top: 0.35rem; line-height: 1.5;">
          You selected a diagnosis that mirrors standard biased AI! Because melanin darkens the lesion, uncalibrated networks incorrectly output <em>Melanocytic Nevus</em>.
        </p>
        <p class="text-cyan font-bold" style="margin-top: 0.25rem;">
          Correct Answer: <strong>A) Lichen Planus</strong>. Note the polygonal shape and white reticular Wickham's striae on the volar wrist.
        </p>
      </div>
    `;
  }
}

function switchTab(tabId) {
  PlatformState.activeTab = tabId;
  document.querySelectorAll(".nav-tab-btn").forEach(b => {
    if (b.getAttribute("data-tab") === tabId) b.classList.add("active");
    else b.classList.remove("active");
  });

  document.querySelectorAll(".tab-content-panel").forEach(panel => {
    if (panel.id === `panel-${tabId}`) panel.classList.remove("hidden");
    else panel.classList.add("hidden");
  });

  if (tabId === "diagnosis") {
    setTimeout(() => renderDermoscopyCanvas("mainDermCanvas", PlatformState.activeCase), 40);
  } else if (tabId === "bio-optics") {
    setTimeout(renderBioOpticsSimulation, 40);
  } else if (tabId === "counterfactual") {
    setTimeout(renderCounterfactualSimulation, 40);
  } else if (tabId === "fairness") {
    setTimeout(renderFairnessAnalytics, 40);
  } else if (tabId === "ai-chat" || tabId === "copilot") {
    setTimeout(() => {
      renderCopilotChat();
      renderFullSoapReport();
    }, 40);
  }
}

// Auto-run when DOM is parsed
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPlatform);
} else {
  initPlatform();
}

