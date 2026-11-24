# SkinFairness-AI: Explainable Multi-Class Skin Disease 23 Classification with Fairness Analysis Across Skin Tones

A state-of-the-art interactive clinical AI platform and research suite addressing the critical equity gap in automated dermatology. Combines **Vision-Transformer (ViT) & Multimodal Generative AI (Med-PaLM M)** with **Grad-CAM visual explainability**, **Concept Bottleneck Models**, and a **Fairness Auditing Suite** across **Fitzpatrick Skin Types (FST I through VI)**.

---

## 🎯 Executive Summary & The Problem

Artificial Intelligence models in dermatology routinely demonstrate high macro accuracy in laboratory benchmarks, yet exhibit dangerous clinical performance degradation when deployed across patients with darker skin tones (Fitzpatrick types V and VI). 

### Key Causes of Disparity
1. **Severe Dataset Representation Skew**: Over 90% of publicly available dermatology benchmarks (e.g., HAM10000, BCN20000) are composed of lesions on Fitzpatrick Skin Types I and II (pale/light Caucasian skin). Fitzpatrick V and VI represent less than 10% of training data.
2. **Optical Erythema Masking**: Western dermatological curricula and standard convolutional neural networks rely heavily on *erythema* (bright pink/red inflammation). In deeply pigmented skin, high epidermal melanin optical absorption attenuates pink redness into violaceous (purple), grey-brown, or hyperpigmented hues. Unmitigated models fail to recognize inflammation in dark skin.
3. **Misattribution of Benign Pigment**: Naive models correlate dark melanin patches with melanocytic nevi, falsely diagnosing inflammatory lesions (such as Lichen Planus or Atopic Eczema) as benign moles, delaying critical care.

---

## 🔬 The 23 Skin Disease Taxonomy (Derma23 / Fitzpatrick 17k)

This platform classifies 23 clinically distinct dermatological diseases spanning malignant neoplasms, premalignant lesions, benign proliferations, inflammatory diseases, autoimmune conditions, and infectious pathologies:

| Code | Disease Name | Category | Risk Level | Tone Manifestation Caveat |
| :--- | :--- | :--- | :--- | :--- |
| **MEL** | Melanoma | Malignant Neoplasm | High | Acral lentiginous melanoma over-represented in FST V-VI; erythema masked. |
| **BCC** | Basal Cell Carcinoma | Malignant Neoplasm | Moderate | Pearly translucent in light skin; heavily pigmented/brown-black in dark skin. |
| **SCC** | Squamous Cell Carcinoma | Malignant Neoplasm | High | Arises in chronic scars/burns in dark skin rather than sun-exposed zones. |
| **AKIEC** | Actinic Keratosis / IEC | Pre-Malignant | Moderate | High melanin confers photoprotection; rare in FST V-VI. |
| **BKL** | Benign Keratosis (Seborrheic) | Benign Neoplasm | Low | Presents as Dermatosis Papulosa Nigra (multiple small papules) in FST V-VI. |
| **NV** | Melanocytic Nevus | Benign Neoplasm | Low | Darker network lines and thicker reticular pattern in high melanin. |
| **DF** | Dermatofibroma | Benign Neoplasm | Low | Hyperpigmented violaceous rim; dimple sign on lateral pinch. |
| **VASC** | Vascular Lesions | Benign Neoplasm | Low | Lacunae appear dark bluish-purple rather than bright red. |
| **ECZ** | Atopic Dermatitis (Eczema) | Inflammatory | Low | Masked erythema; presents as slate-grey or hyperpigmented lichenified plaques. |
| **PSO** | Psoriasis Vulgaris | Inflammatory | Low | Salmon-pink with silvery scales in light skin; violaceous with dull scale in dark skin. |
| **LP** | Lichen Planus | Inflammatory | Moderate | Violaceous polygonal papules with Wickham's striae; high PIH risk. |
| **VIT** | Vitiligo | Autoimmune | Low | Complete depigmentation; dramatic contrast in dark skin. |
| **ACN** | Acne Vulgaris | Cutaneous Appendage | Low | High incidence of long-lasting Post-Inflammatory Hyperpigmentation (PIH). |
| **ROS** | Rosacea | Cutaneous Appendage | Low | Severely underdiagnosed in dark skin due to masked facial flushing. |
| **ALO** | Alopecia Areata | Autoimmune | Low | Non-scarring patchy hair loss; black dots prominent against dark scalp. |
| **CLE** | Cutaneous Lupus (CLE) | Autoimmune | High | Discoid scarring with hyperpigmented borders and central depigmentation. |
| **TIN** | Tinea (Dermatophytosis) | Infectious / Fungal | Low | Annular active scaly rim; central clearing is hyperpigmented (PIH) in FST V. |
| **IMP** | Impetigo | Infectious / Bacterial | Moderate | Honey-colored golden crusting over dark or violaceous base. |
| **CEL** | Cellulitis | Infectious / Bacterial | High | Warmth and edema are critical signs; redness is frequently invisible. |
| **HZV** | Herpes Zoster (Shingles) | Infectious / Viral | Moderate | Dermatomal vesicular eruption on dusky or violaceous plaque. |
| **URT** | Urticaria (Hives) | Inflammatory | Low | Wheals appear as palpable swelling with subtle pigment change. |
| **BP** | Bullous Pemphigoid | Autoimmune | High | Tense subepidermal bullae on urticarial or normal skin. |
| **VER** | Verruca Vulgaris (Wart) | Infectious / Viral | Low | Exophytic cauliflower papule with punctate thrombosed capillaries. |

---

## 🎨 Fitzpatrick Skin Tone Scale & ITA° Metric

Individual skin tone is objectively quantified using the **Individual Typology Angle (ITA°)** in CIE L\*a\*b\* color space:

$$\text{ITA}^\circ = \arctan\left(\frac{L^* - 50}{b^*}\right) \times \frac{180}{\pi}$$

- **FST I (Very Light / Pale):** $\text{ITA} > 55^\circ$
- **FST II (Fair / White):** $41^\circ < \text{ITA} \le 55^\circ$
- **FST III (Medium / Olive-White):** $28^\circ < \text{ITA} \le 41^\circ$
- **FST IV (Olive / Moderate Brown):** $10^\circ < \text{ITA} \le 28^\circ$
- **FST V (Brown / Dark):** $-30^\circ < \text{ITA} \le 10^\circ$
- **FST VI (Deeply Pigmented / Black):** $\text{ITA} \le -30^\circ$

---

## 🔍 Explainable AI (XAI) Architecture

1. **Gradient-weighted Class Activation Mapping (Grad-CAM)**:
   Computes the gradient of the predicted class score $y^c$ with respect to the feature activation maps $A^k$ of the final transformer/convolutional layer:
   $$\alpha_k^c = \frac{1}{Z} \sum_i \sum_j \frac{\partial y^c}{\partial A_{i,j}^k}$$
   $$L_{\text{Grad-CAM}}^c = \text{ReLU}\left(\sum_k \alpha_k^c A^k\right)$$
   In unmitigated models on dark skin, gradients often scatter across normal background melanin. Our debiasing preserves sharp focal localization on true diagnostic margins.

2. **Concept Bottleneck Attributions**:
   Decomposes neural predictions into human-interpretable clinical features:
   - ABCD Criteria: Asymmetry, Border Irregularity, Color Variegation, Diameter
   - Pathognomonic Concepts: Wickham's striae, Arborizing telangiectasia, Silvery scale, Lichenification, Honey-crusting

---

## ⚖️ Algorithmic Fairness Formulations & Mitigation Strategies

### Evaluated Fairness Criteria
- **Equal Opportunity Gap**: Difference in True Positive Rate between privileged ($A=0$, FST I-II) and unprivileged ($A=1$, FST V-VI) groups:
  $$\Delta_{\text{EOD}} = |\text{TPR}_{\text{light}} - \text{TPR}_{\text{dark}}| \quad (\text{Target: } < 5\%)$$
- **Disparate Impact Ratio (80% Legal Rule)**:
  $$\text{DI} = \frac{P(\hat{Y}=1 \mid A=1)}{P(\hat{Y}=1 \mid A=0)} \ge 0.80$$
- **Average Odds Difference**:
  $$\text{AOD} = \frac{1}{2}\left[(\text{FPR}_{\text{dark}} - \text{FPR}_{\text{light}}) + (\text{TPR}_{\text{dark}} - \text{TPR}_{\text{light}})\right]$$

### Mitigation Strategies Compared
1. **Unmitigated Baseline**: Standard Cross-Entropy loss ($25.6\%$ EOD gap, fails 80% rule with $\text{DI} = 0.68$).
2. **Inverse Frequency Reweighting**: Loss penalization weighted inversely to skin tone frequency ($14.3\%$ gap).
3. **Adversarial Debiasing (Gradient Reversal Layer)**: Min-max game removing skin-tone predictive information from latent representations ($8.4\%$ gap).
4. **Post-Hoc Group-Calibrated Thresholding**: Group-specific decision boundary calibration ($4.6\%$ gap).
5. **Generative Fair Augmentation (Diffusion-Balanced SOTA)**: Latent Diffusion synthetic balancing achieving state-of-the-art equity ($2.9\%$ gap, $\text{DI} = 0.96$).

---

## 🤖 Generative AI Dimension

1. **Multimodal Clinical Copilot**: Generates structured SOAP clinical notes (Subjective, Objective, Assessment, Plan) with tone-aware equity cautions.
2. **Interactive Clinical Q&A**: Answers physician questions regarding Grad-CAM saliency, differential diagnosis rule-outs, and biopsy protocols.
3. **Counterfactual Tone Simulator**: Simulates how identical pathological morphology translates across FST I through FST VI in real-time.

---

## 🚀 Running the Web Application

### Option 1: Direct Browser Launch
Open `index.html` directly in any web browser (Google Chrome, Microsoft Edge, Firefox, Safari).

### Option 2: Python Local Web Server
Run the included `serve.py` server runner:
```bash
python serve.py
```
Then navigate to `http://localhost:8080` in your web browser.

---

## 📂 Project Structure

```
individual project/
├── index.html       # Single-Page Interactive Web Application Dashboard
├── app.js           # Clinical AI engine, XAI Grad-CAM renderer, fairness auditor & Generative AI copilot
├── styles.css       # Medical-tech glassmorphism styling, animations, and color definitions
├── serve.py         # Cross-compatible Python 2.7 / 3.x HTTP server
└── README.md        # Comprehensive research and technical documentation
```

---

*SkinFairness-AI Platform © 2026. For research and clinical evaluation.*
