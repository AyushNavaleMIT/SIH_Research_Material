# SIH26188 — AI-Based Fake Identity & Document Screening System
## Research Analysis → Innovation → Build Roadmap

**Scope note (read first):** Of your 5 uploaded papers, only **2 are actually about identity-document forgery** (Dai et al. 2025; Ruiz/Tapia/Busch 2025 SLR). The other 3 are about **face** presentation-attack detection (Baweja et al. one-class fPAD; Tian et al. polarization anti-spoofing) or general **identity-fraud/authentication** systems (Zhang et al. SLR), not document forensics. This matters — it means your literature base for the *document* half of the problem is thin (essentially one deployed system + one review), while your literature base for the *face liveness* half is stronger. I've flagged this everywhere it affects a claim below. I have not invented data, accuracy numbers, or dataset sizes that aren't in the papers.

---

## PART 1 — PAPER-BY-PAPER ANALYSIS

### Paper 1: "AI-Based Identity Fraud Detection: A Systematic Review" (Zhang, Gill, Liu, Anwar — UTS, Jan 2025)

**A. Basic info:** Systematic literature review, 43 papers (2020–2024), 4 databases (IEEE, ACM, ScienceDirect, Scopus). arXiv:2501.09239.

**B. Problem:** Not document-specific — reviews AI methods for identity fraud across two phases: *authentication* (biometric recognition, visual anomaly detection against fake biometrics/forged IDs) and *continuous authentication* (behavioral anomaly detection via UEBA).

**C. Proposed solution:** No new model — a taxonomy. Authentication defense = feature-based (HOG, SIFT, LBP, ORB, Gabor, MCM) or deep-learning-based (CNN, ResNet, U-Net, VGG, XceptionNet, InceptionResNet) visual anomaly detection. Continuous authentication = UEBA with historical or relational pattern modeling, analyzed via ML (SVM, Random Forest), DL (GNN, CNN, Bi-GRU), or statistical modeling (F-test, Gaussian Process).

**D. Dataset:** Not applicable — it's a review. Per-reviewed-paper dataset details are **not extracted** in this SLR beyond attack type; sizes are not reported.

**E. Results:** No aggregate results — Appendix B lists individual reviewed papers' accuracies (55–99%), not comparable across studies (different metrics, datasets, tasks).

**F. Limitations:**
- *Explicit:* Robustness (lack of diverse data — cited in 33–47% of reviewed visual-anomaly papers), limited transferability across conditions/devices, long training times, data-privacy restrictions, dynamic/evolving fraud tactics, threshold misconfiguration.
- *Additional (my analysis):* This is a review of a review — its "gap" findings are second-hand and can't be independently verified against the primary papers. It explicitly separates document-forgery-adjacent work ("ID Doc: Guilloche," "ID Doc: Hologram," "ID Doc: Tampered regions" — see Fig. 7) from face/biometric work, but never proposes fusing them — this absence is itself informative for Part 3.

---

### Paper 2: "A Machine Learning Framework for Forgery Detection in Digital ID Documents" (Dai, Alonso, Gutiérrez-Meana — Tree Technology, IMPULSE project, 2025)

**A. Basic info:** Journal of Innovation Management, Vol 13(2). Deployed industrial system (EU Horizon 2020 IMPULSE project, grant 101004459), tested across 5–6 European countries.

**B. Problem:** Real onboarding pipeline needs to verify a smartphone photo of an ID/passport is genuine, without requiring the physical document.

**C. Proposed solution — this is your best real-world reference architecture:**
- OCR: Tesseract/EasyOCR (LSTM-based)
- MRZ verification: standardized field extraction + checksum per ICAO 9303 / ISO 7501
- Copy-move forgery detection: SIFT keypoints + DBSCAN clustering to find duplicated regions (e.g., a digit copied from one field to another)
- Imitation/character forgery detection: OCR extracts each character → features (size, color, skewness, alignment) + one-class SVM trained only on genuine characters → flags outliers
- **Global forgery score:** currently a simple **average** of MRZ + copy-move + morphology + face-recognition scores, with adaptive thresholds per nationality
- **Explainability:** returns a "forgery proof image" — visually marks the source/destination of copy-move regions and boxes suspicious characters (Figure 2 in the paper is a real example). This is the single most useful explainability precedent in your whole corpus.

**D. Dataset:**
- Genuine: 72 ID cards + 32 passports, real documents from volunteer project-consortium members (Spain, Iceland, Denmark, Bulgaria, Italy), GDPR consent
- Forged: **no real forged documents exist in the dataset** — a custom simulator generates forgeries (resize, move, rotate, copy-move, character insertion) on top of genuine images
- Evaluation set: 103 genuine documents → 174 genuine images (142 ID-card front/back + 32 passport biodata pages); 348 simulated forged images

**E. Results (their own reported numbers):**
| Module | Test set | Accuracy |
|---|---|---|
| Copy-move forgery detection | 348 images (174 genuine + 174 forged) | **92%** |
| Morphology/imitation forgery detection | 209 images (35 genuine + 174 forged) | **89.04%** |
| MRZ detection & reading | 103 images | **98.41%** |

**F. Limitations:**
- *Explicit:* No public ID-forgery benchmark exists, so no external comparison is possible; synthetic forgeries "cannot fully replicate the complexity of real-world forgery cases"; MRZ module is document-specific and doesn't generalize to other forgery-detection contexts; scoring fusion is currently a naive average, not learned — **the authors themselves say future work will optimize weights via gradient descent**.
- *My additional analysis:* No liveness/presentation-attack layer at all (doesn't check if the *photo itself* was recaptured from a screen — that's paper 5's domain, not this one). No deepfake/face-morph detection. No cross-field consistency beyond MRZ vs. printed fields. Small genuine-document base (only 104 unique documents) — heavy reliance on synthetic forgeries means real-world generalization is unproven by their own admission.

---

### Paper 3: "Anomaly Detection-Based Unknown Face Presentation Attack Detection" (Baweja, Oza, Perera, Patel — JHU, 2020)

**A. Basic info:** IJCB 2020. arXiv:2007.05856. Face presentation-attack detection (fPAD) — **not document forgery**.

**B. Problem:** Standard two-class fPAD (train on real + fake face images) generalizes poorly to *unseen* attack types. Solution: train only on genuine (bonafide) faces, treat attacks as anomalies.

**C. Proposed solution:** CNN feature extractor (VGGFace backbone) + a one-class classifier trained with a *pseudo-negative* class sampled from a Gaussian centered on an **adaptive running mean** of genuine features (not a fixed zero-centered Gaussian like prior OC-CNN work) + Pairwise Confusion loss to strip identity information from features so the model focuses on liveness cues, not who the person is.

**D. Dataset:** Four public face-PAD datasets — Replay-Attack (1300 videos, 50 identities), Rose-Youtu (3350 videos, 20 identities, 5 phone models), OULU-NPU (4950 videos, 55 identities, 6 devices), Spoof in Wild (4478 videos, 165 identities). Attacks: print, replay/screen, mask. All are **face** videos, not ID documents.

**E. Results (ACER%, Protocol 1 — lower is better):**
| Dataset | Best baseline (OC-GMM/OC-CNN) | Proposed |
|---|---|---|
| Replay Attack | 30.10 | **20.74** |
| Rose-Youtu | 35.81 | **31.62** |
| OULU-NPU | 45.80 | **30.24** |
| Spoof in Wild | 36.99 | **23.34** |

**F. Limitations:**
- *Explicit:* None stated beyond standard ablation discussion.
- *My analysis:* Zero document relevance beyond the *concept* it validates — that one-class/anomaly training generalizes better to unseen attacks than binary classifiers trained on known attack types. This is directly transferable logic to document forgery (where you also can't enumerate every forgery technique in advance), but the paper itself never tests it on documents. All datasets are lab/webcam-quality face captures, not smartphone document photos — a domain gap if you try to reuse this code directly.

---

### Paper 4: "Face Anti-Spoofing by Learning Polarization Cues in a Real-World Scenario" (Tian, Zhang, Wang, Sun — CASIA, 2020)

**A. Basic info:** arXiv:2003.08024. Face anti-spoofing using a **polarization camera** — specialized hardware.

**B. Problem:** RGB/grayscale face anti-spoofing fails to generalize; the paper proposes using the physical material difference between skin and spoof materials (paper, screen, mask), captured via polarization imaging (Stokes parameters → DOLP images).

**C. Proposed solution:** MobileNetV2 trained on DOLP (Degree of Linear Polarization) images instead of RGB/grayscale.

**D. Dataset:** "Face-DOLP dataset" — **size not specified in the paper.** Not public. Not document-related.

**E. Results:**
| Input | EER | TPR@FPR=1e-2 | TPR@FPR=1e-3 |
|---|---|---|---|
| RGB | 28.48% | 0.28 | 0.02 |
| Grayscale | 25.88% | 0.47 | 0.27 |
| **DOLP (proposed)** | **0.0%** | **1.0** | **1.0** |

Also beats handcrafted features (mean/std/kurtosis/LBP, EER 31–50%).

**F. Limitations:**
- *Explicit:* None stated — the paper is short and doesn't discuss failure modes.
- *My analysis, and this is important for your team:* **This result is not achievable on a smartphone.** Polarization cameras are specialized hardware nobody's phone has. A 0.0% EER on an unspecified-size, non-public, single-lab dataset with no cross-dataset validation is also a strong overfitting/small-dataset red flag — treat this number with skepticism, not as a target. The only thing worth taking from this paper is the *conceptual* point: physical-material cues beat texture-only cues for liveness. You cannot implement the actual method in a hackathon (no hardware access), so this paper is **not directly usable** for SIH26188 beyond citing the concept.

---

### Paper 5: "Identity Card Presentation Attack Detection: A Systematic Review" (Ruiz, Tapia, Soto, Busch — Nov 2025) ⭐ Most relevant paper in your set

**A. Basic info:** arXiv:2511.06056. PRISMA-methodology SLR, 29 primary studies (16 methodology papers + 13 dataset papers), 2020–2025, ID-card/passport PAD specifically.

**B. Problem:** Comprehensive review of AI-based PAD for identity documents — datasets, architectures, metrics, and gaps.

**C. Proposed solution:** No new model — but documents the field's evolution: CNN classifiers → multi-stage hybrid systems (e.g., MobileNet for composite-vs-not, then a second network for print/screen/real) → forensic micro-artifact analysis (moiré patterns, DCT/frequency-domain, texture disentanglement) → **Foundation Models** (DinoV2, CLIP) as the current frontier, including a privacy-preserving patch-based method (FakeIDet) that trains on small anonymized patches of *real* documents.

**D. Dataset landscape (this table alone is worth the read for your team):**

| Dataset | Real or mock-up? | Attack types | Scale |
|---|---|---|---|
| MIDV family | Mock-ups | None (base) / print / pseudo-holograms | 500–1000 doc types |
| DLC2021 | Laminated mock-ups | Print (color/gray), screen | 1,424 clips, 10 countries |
| KID34K | Real *plastic cards*, synthetic data | Print, screen | 34,662 images, Korea only |
| SIDTD | Mock-ups (MIDV-2020) | Digital composite (crop-replace, inpaint) | 1,000 docs |
| IDNet | AI-generated synthetic | Composite, face morph, portrait swap, text replace | 837,060 images, largest available |
| Syn-IDPASS | Synthetic, ICAO-9303 compliant | Print, screen | 9,000 images, 3 countries |
| RSCID | Synthetic on acrylic plastic | Print/scan, display/capture, substrate variation | 1,104 images |
| FantasyID | Synthetic + real faces | Face-swap, text inpainting (digital only) | 1,086 bona fide images |
| **FakeIDet-db** | **Real Spanish IDs (patches only)** | Print (laminated), screen | 48,400 patches, 30 real documents |

**The core finding: essentially every public ID-document dataset is either a mock-up, a synthetic template, or (at best) patches of a handful of real documents.** No public dataset of real, diverse, government-issued documents at scale exists — for well-understood privacy/GDPR reasons.

**E. Results (benchmark competition numbers, most externally valid figures in your corpus):**
- IJCB PAD-ID-card 2024: best team EER **21.87%**
- IJCB PAD-ID-card 2025, Track 1 (closed/private data): best EER **11.34%**
- IJCB PAD-ID-card 2025, Track 2 (open-set generalization): best EER **6.36%**
- FakeIDet: 0% EER at ID level on internal test vs. 33.3% EER using the same model on full (non-patch) images — patch-based privacy-preserving training actually *outperformed* whole-image training in their setup.

**F. Limitations:**
- *Explicit (their own conclusions):* Three named, explicit gaps — the **"Reality Gap"** (private-data models vastly outperform public-benchmark models — over 60% of methodology papers use private/in-house data), the **"Synthetic Utility Gap"** (perceptual realism of GAN-generated training data, measured by FID, does not correlate with downstream detection utility — models risk learning generation artifacts, not attack artifacts), and the **"Paradigm Gap"** (foundation models generalize better than task-specific CNNs trained from scratch, but this is barely explored).
- *My additional analysis:* This paper explicitly names things your team could actually build: forensically-aware XAI (not generic Grad-CAM, but pixel-level artifact attribution) and cross-industry federated/privacy-preserving training as unsolved. It also confirms screen-replay attacks remain the hardest category across the field — a good target for your demo.

---

## PART 2 — RESEARCH COMPARISON MATRIX

| Paper | Year | Doc. Forgery | OCR | MRZ | Face Match | Deepfake | Synthetic ID | Multimodal | Explainability | Dataset (real?) | Main Limitation |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Zhang et al. (SLR) | 2025 | Partial (reviews it) | ✗ | ✗ | ✓ (reviews) | ✓ (reviews) | ✗ | ✗ (notes gap) | ✗ | N/A (review) | Second-hand review, no docs analyzed directly |
| **Dai et al. (Tree Tech)** | 2025 | **✓ (core)** | **✓** | **✓** | Partial (score only) | ✗ | ✗ | ✓ (naive avg) | **✓ (best in set)** | ✓ real (104 docs) + sim. forgeries | No public benchmark; synthetic forgeries only; naive-average fusion |
| Baweja et al. (JHU) | 2020 | ✗ | ✗ | ✗ | ✓ (face only) | ✗ | ✗ | ✗ | ✗ | ✓ real (4 public sets) | Face liveness only, not documents |
| Tian et al. (CASIA) | 2020 | ✗ | ✗ | ✗ | ✓ (face only) | ✗ | ✗ | ✗ | ✗ | ✗ unspecified size, private | Needs polarization hardware; not phone-deployable |
| **Ruiz/Tapia/Busch (SLR)** | 2025 | **✓ (core)** | ✗ | ✗ | ✗ | Partial (morph) | ✓ (reviews it heavily) | ✓ (notes gap) | ✓ (calls for it) | N/A (reviews 9 datasets, mostly mock-up) | Field-wide Reality Gap + Synthetic Utility Gap |

**Ranking (honest, based only on your 5 papers):**

- **Top papers for direct technical reuse:** Dai et al. (architecture you can literally copy: OCR+MRZ+SIFT-copy-move+one-class-SVM-morphology+fusion) and Ruiz/Tapia/Busch (tells you what NOT to waste time on and what the field considers current best-practice).
- **Technically strongest / most rigorous:** Ruiz/Tapia/Busch — PRISMA methodology, ISO-standard metrics (APCER/BPCER/EER), 29 studies synthesized, names its own limitations precisely. Baweja et al. is also methodologically strong (proper ablations, 4 public datasets, 2 protocols) but off-domain.
- **Biggest unresolved gaps, most relevant to you:** Ruiz/Tapia/Busch (Reality Gap, Synthetic Utility Gap — directly a warning about your own dataset strategy) and Dai et al. (admits fusion is naive, admits no liveness layer, admits no real forged documents).
- **Least relevant to SIH26188 as written:** Tian et al. (hardware-dependent) is the one paper you probably cannot use operationally at all.

---

## PART 3 — THE RESEARCH GAP (pattern-level, not a limitations list)

**What existing research does well:** Individual detection modules are mature and well-validated in isolation — OCR/MRZ verification (Dai et al.: 98.41% MRZ accuracy), copy-move detection (92%), one-class anomaly-based liveness that generalizes to unseen attacks (Baweja et al.), and forensic micro-artifact analysis for recapture detection (moiré, DCT — per Ruiz/Tapia/Busch §III.C). The field also increasingly recognizes that foundation models generalize better than task-specific CNNs (Ruiz/Tapia/Busch §III.F–G).

**What existing research repeatedly fails to solve, across every paper that touches it:**
1. **Learned, explainable multimodal fusion.** Every fusion step observed in your corpus is either absent or naive. Dai et al.'s own scoring module is a plain average — and the authors flag this as a to-do, not a solved problem.
2. **Real, diverse, public training/eval data.** Zhang et al., Dai et al., and Ruiz/Tapia/Busch *all independently* land on the same wall: privacy regulation (GDPR) blocks real-document data collection at scale, so the field trains on mock-ups, synthetic templates, or a handful of consortium-donated real documents (72–104 documents in Dai et al.; 30 in FakeIDet).
3. **Generalization to unseen attack types and unseen document formats.** Named explicitly in Zhang et al. ("limited transferability" — the single most frequent open challenge across their 43 papers) and empirically demonstrated in the IJCB competition results (Ruiz/Tapia/Busch): closed-set EER 11.34% vs. open-set 6.36%* — *note this specific pair is Track1 vs Track2 of the *same* 2025 competition, not a clean same-condition comparison, but the field-wide competition narrative confirms cross-domain generalization is the dominant failure mode.

**Which problems appear across multiple papers?** Data scarcity/privacy (3 of 5 papers), poor generalization to novel attacks (3 of 5 papers), and shallow/absent fusion of signals (implicit in all — nobody combines more than 2 signal types except Dai et al.'s crude average).

**Which problems are treated separately even though they should be combined?**
This is the clearest, most literature-supported finding in your set: **face-liveness research (Baweja, Tian) and document-forgery research (Dai, Ruiz/Tapia/Busch) are entirely separate literatures that do not cite or build on each other in your corpus.** Zhang et al.'s taxonomy formally splits "biometric recognition" from "ID-document authentication" as different branches (Fig. 4/5) and never proposes merging them. Dai et al. mentions face recognition only as one input averaged into their score — it is not deeply integrated, has no liveness/anti-spoofing check of its own, and is not elaborated on at all in the paper. **Nobody in your literature set combines: (a) is the document image itself unforged, (b) is the face photo on it a live/un-spoofed capture of a real person, (c) does that face match the document photo, and (d) are the extracted fields internally and cross-referentially consistent — into one reasoned, explainable risk score.**

**Can these signals be combined into one evidence-driven identity risk engine?** Yes — this is achievable with existing techniques (nothing here requires inventing new ML), and it is genuinely not yet done in your literature set. That is your opening. It is an **integration + explainability + honest uncertainty-communication** innovation, not a "new model" innovation — which is the right kind of innovation for a 6-member student team on a hackathon clock (see Part 7).

---

## PART 4 — ATTACK TAXONOMY: what's handled vs. weak

Grounded in Ruiz/Tapia/Busch's formal taxonomy (Bona fide / Printed / Screen / Composite-Border / Simulated bona fide) plus Dai et al.'s and Zhang et al.'s coverage.

| Attack | Handled by (your papers) | Coverage | Weak point |
|---|---|---|---|
| Copy-paste / copy-move on document | Dai et al. (SIFT+DBSCAN) | Strong (92% in their test) | Only tested on simulated forgeries, not real-world attacker copy-move |
| Character/imitation forgery (font/size mismatch) | Dai et al. (one-class SVM) | Moderate (89.04%) | Small training base (139 genuine images) |
| MRZ tampering | Dai et al. | Strong (98.41%) | MRZ-specific, doesn't generalize to non-MRZ docs (e.g. many countries' driving licences) |
| Printed copy of real doc | Ruiz/Tapia/Busch (field-wide) | Well studied, many datasets | Print quality varies wildly; DPI/substrate affects detectability |
| Screen replay / recapture | Ruiz/Tapia/Busch | **Explicitly named as hardest, most persistently unsolved attack in the field** | Moiré-pattern methods degrade with high-PPI screens |
| Composite/splicing (photo swap, signature swap) | Ruiz/Tapia/Busch (reviews several) | Moderate | Most public datasets simulate this only digitally, not physically re-captured |
| Face morphing on document photo | Ruiz/Tapia/Busch (IDNet dataset covers it) | Weak — one dataset, synthetic only | No paper in your set actually implements a morph detector |
| AI-generated/synthetic whole document | Ruiz/Tapia/Busch ("Simulated bona fide," IDNet) | Emerging, weak | Explicitly flagged as the newest, least-solved attack class (see DeepID 2025 challenge mention) |
| Face presentation attack (print/screen/mask of a *face*, not doc) | Baweja et al., Tian et al. | Strong in face-only literature | Never connected to the document pipeline in your papers |
| Deepfake selfie / live video | Zhang et al. (reviews), Baweja et al. (technique transfers) | Conceptually covered, not document-integrated | No paper tests deepfake selfie *against a document photo match* |
| Cross-field inconsistency (DOB mismatch across sources) | Zhang et al. (names it as a gap) | **Essentially unaddressed** | No implementation found in any of your 5 papers |
| Synthetic identity (invented person, real-looking doc) | Zhang et al. (mentions), Ruiz/Tapia/Busch (IDNet targets this) | Weak | Detection approach not demonstrated end-to-end |

**Bottom line:** the strongest, most demo-able attack for your prototype — because it's well-understood in the literature (Dai et al. + Ruiz/Tapia/Busch) and gives you clean before/after visuals — is **copy-move + character imitation forgery**. The attack the *field* considers hardest and most currently relevant is **screen replay**. The attack that is **genuinely open territory** for a novel contribution is **cross-field/cross-source consistency checking** — nobody in your corpus has built it.

---

## PART 5 — PIPELINE DESIGN (evidence-modified, not blindly copied)

The "textbook" pipeline in your prompt is close to right, but two changes are justified by the literature: (1) **face-liveness must be its own explicit module**, not folded into "face matching," because Baweja et al./Tian et al. show liveness is a distinct, harder problem than 1:1 face matching; (2) a **cross-field/cross-source consistency module** should be added, because Zhang et al. names it as an unaddressed gap and it's cheap to build (mostly rule-based + light ML, no new dataset needed).

```
SMARTPHONE CAPTURE (document + selfie)
        │
        ▼
IMAGE QUALITY GATE  ── reject/reshoot on blur, glare, low-res
        │              (supported by: Dai et al.'s "image quality check endpoint")
        ▼
DOCUMENT DETECTION & CROP  ── bounding box + perspective correction
        │
        ▼
DOCUMENT TYPE CLASSIFICATION  ── which country/doc template?
        │              (supported by: Ruiz/Tapia/Busch — doc-type variability is a named
        │               generalization bottleneck; classify before specializing)
        ▼
OCR + FIELD EXTRACTION  ── Tesseract/EasyOCR per Dai et al.
        │
        ▼
MRZ / BARCODE VALIDATION  ── checksum, ICAO-9303 format (Dai et al.: 98.41% acc.)
        │
        ▼
DOCUMENT FORGERY DETECTION
   ├─ Copy-move (SIFT+DBSCAN)         — Dai et al., 92% acc.
   ├─ Imitation/character forgery      — Dai et al. one-class SVM, 89% acc.
   └─ Recapture/screen-replay forensic — frequency-domain / moiré (Ruiz/Tapia/Busch §III.C)
        │
        ▼
FACE EXTRACTION (from doc + selfie)
        │
        ▼
FACE LIVENESS / PRESENTATION-ATTACK CHECK  (selfie only)
        │              (one-class anomaly approach — Baweja et al.,
        │               generalizes to unseen attacks without needing attack data)
        ▼
FACE–DOCUMENT MATCH  ── 1:1 similarity score
        │
        ▼
CROSS-FIELD / CROSS-SOURCE CONSISTENCY CHECK   ← genuinely underexplored, your opening
        │  (DOB on doc vs. DOB in MRZ vs. DOB in age-implied-by-photo;
        │   document-number format vs. issuing-country rules; expiry-vs-issue-date sanity)
        ▼
MULTIMODAL RISK FUSION  ── learned (not averaged) — logistic regression / Random Forest
        │              (Dai et al.'s own limitation: "future work optimizes weights via
        │               gradient descent" — you are doing that future work)
        ▼
EXPLAINABLE RISK SCORE + EVIDENCE LIST
        │              (extends Dai et al.'s "forgery proof image" concept to all modules)
        ▼
LOW → PASS   /   MEDIUM → HUMAN REVIEW   /   HIGH → REJECT+FLAG
```

Per-module notes (why / support / limitation / cost):

| Module | Why required | Literature support | Remaining limitation | Model/algo | Compute cost | Difficulty |
|---|---|---|---|---|---|---|
| Quality gate | Garbage-in prevention | Dai et al. | Threshold tuning per device | Blur/glare heuristics (Laplacian variance, histogram) | Very low | Easy |
| Doc type classification | Specializes downstream models, reduces cross-domain failure | Ruiz/Tapia/Busch (generalization gap) | Needs template examples per country/state you support | MobileNetV2 or lightweight ViT | Low | Medium |
| OCR + fields | Needed for everything downstream | Dai et al. | Handwriting/non-Latin scripts weak (per Ruiz/Tapia/Busch MIDV-LAIT discussion) | EasyOCR/Tesseract/PaddleOCR | Low | Easy–Medium |
| MRZ/barcode | Cheap, high-accuracy signal | Dai et al. (98.41%) | Not all doc types have MRZ | Regex + checksum per ICAO 9303 | Very low | Easy |
| Copy-move detection | Detects the most common cheap forgery | Dai et al. (92%) | Only validated on simulated forgeries | SIFT + DBSCAN | Medium | Medium |
| Imitation/morphology detection | Detects imitation/typed-over forgery | Dai et al. (89%) | Small training base, one-class only | One-class SVM on char features | Low | Medium |
| Recapture/screen detection | Hardest attack per field consensus | Ruiz/Tapia/Busch | Requires careful frequency-domain feature work, no ready dataset in your set | DCT/frequency features + classifier | Medium | Hard |
| Face liveness | Prevents selfie spoofing separately from doc forgery | Baweja et al. | Domain gap (face-PAD datasets ≠ your users' phones) | One-class anomaly (adapt Baweja approach), no polarization hardware (reject Tian et al. approach) | Medium | Medium-Hard |
| Face–doc match | Confirms same person | Standard (not deeply covered in your papers) | Off-the-shelf face-embedding models (e.g., ArcFace) recommended | Pretrained face embedding + cosine similarity | Low (inference) | Easy |
| Cross-field consistency | **Named gap, unaddressed in literature** | Zhang et al. (names gap only) | No prior implementation to build on — you're first | Rule engine + lightweight anomaly model | Low | Medium |
| Risk fusion | Naive averaging is the field's current state (Dai et al.) | Dai et al. (explicitly incomplete) | Needs labeled multimodal training data (your self-generated set) | Logistic Regression → Random Forest if data allows | Low | Medium |
| Explainability | Field explicitly calls for this (Ruiz/Tapia/Busch) | Dai et al. (partial precedent) | Needs per-module evidence surfaced, not just final score | Rule-based evidence aggregation + visual overlays | Low | Medium |

---

## PART 6 — INNOVATION DIRECTIONS

### Innovation 1: Evidence-Driven Explainable Risk Fusion Engine ⭐ (recommended)
- **Problem:** No system in your literature learns a fused, explainable risk score across document forgery + face liveness + face match + cross-field consistency.
- **Existing research:** Dai et al. averages 3-4 scores naively; no cross-field module exists anywhere in your corpus.
- **Existing limitation:** Naive averaging is provably suboptimal (the paper's own authors say so) and gives judges/reviewers no reasoning trail.
- **Your solution:** Learn fusion weights (logistic regression/Random Forest) over module scores + evidence tags; output a structured evidence list (not just a percentage) modeled on Dai et al.'s forgery-proof-image concept, extended to every module.
- **Why different:** Combines two literatures (document forensics + face liveness) that don't currently talk to each other in your papers, and replaces an admitted weak point (naive averaging) with a documented, evaluable improvement.
- **Technical implementation:** Feasible in hackathon time — the hard parts (OCR, copy-move, MRZ, one-class SVM) are literally described step-by-step in Dai et al.
- **Dataset required:** Your own self-generated genuine+forged set (Part 11) — small scale but sufficient for logistic regression/Random Forest with 5-10 input features.
- **Difficulty:** Medium. **Hackathon impact:** High (very demoable). **Research novelty:** Moderate-honest — it's integration novelty, not algorithmic novelty. **Risk of "already existing":** Low for the *combination*; the individual pieces are known.

### Innovation 2: Cross-Field / Cross-Source Consistency Engine
- **Problem:** Zhang et al. explicitly lists this as unaddressed; no paper in your set implements it.
- **Solution:** Rule + anomaly-detection layer checking DOB-vs-MRZ-vs-visual-age-estimate, document-number format per issuing authority, issue/expiry date sanity, name consistency across OCR passes.
- **Why different:** True open territory in your literature — nobody else does this specific check.
- **Difficulty:** Medium (mostly rules, some light ML for age-estimate-vs-DOB sanity). **Risk of "already existing":** Very low. **Caveat, honestly:** it's a smaller, narrower contribution than Innovation 1 — good as a *module inside* Innovation 1, weaker as a standalone headline.

### Innovation 3: One-Class Screen-Replay/Recapture Detector
- **Problem:** Field consensus (Ruiz/Tapia/Busch) names screen replay as the hardest, most persistent unsolved attack.
- **Solution:** Adapt Baweja et al.'s one-class anomaly approach (trained only on genuine document captures, no attack data needed) to frequency-domain features of documents instead of faces.
- **Why different:** Applies a proven face-PAD technique to document forgery — cross-domain transfer that nobody in your set has done.
- **Difficulty:** Hard — you'd need to build the frequency-domain feature pipeline from scratch with no existing dataset to validate against; realistically a stretch goal, not MVP.
- **Risk of "already existing":** Moderate — the SLR (Ruiz/Tapia/Busch) shows several groups already doing frequency-domain recapture detection, just not with this specific one-class transfer.

### Innovation 4: Privacy-Preserving Patch-Based Training (à la FakeIDet)
- **Problem:** Data-privacy is the single most repeated blocker across your corpus (Zhang et al., Dai et al., Ruiz/Tapia/Busch all name it).
- **Solution:** Train forgery detectors on small anonymized patches of your self-collected genuine documents rather than whole images, per the FakeIDet result reported in Ruiz/Tapia/Busch (0% EER at doc level vs. 33.3% on full images in their setup).
- **Why different:** Directly addresses the field's #1 named blocker.
- **Difficulty:** Medium, but **this is a training methodology, not a demo feature** — it will be invisible to judges unless you specifically explain the privacy angle. Good talking point, weak standalone visual.
- **Risk of "already existing":** High — this exact idea is already published (FakeIDet, 2025) and reviewed in your own Paper 5. Presenting it as your core innovation would be a Check-1 failure ("are we reproducing an existing paper?" — yes, largely).

### Innovation 5: A New Document-Forgery Foundation-Model Fine-tune
- **Problem:** Ruiz/Tapia/Busch shows foundation models (DinoV2, CLIP) generalize better than task-specific CNNs.
- **Solution:** Fine-tune a pretrained ViT/DinoV2 backbone on your dataset.
- **Why different:** It isn't, really — this is literally what Tapia & Busch (2025), inside your own Paper 5, already did.
- **Difficulty:** High for a student team (compute + data), and **novelty is essentially zero** — you'd be reproducing published work.
- **Recommendation: do not lead with this.** Optional stretch goal if you want a small accuracy bump on the demo, but be honest with judges that it's applying a known technique, not inventing one.

### Scoring (1–10, honest)

| Innovation | Novelty | Feasibility | SIH relevance | Demonstrability | Accuracy potential | Explainability | Scalability | Dataset availability | Impl. difficulty (10=hard) | Judge impact |
|---|---|---|---|---|---|---|---|---|---|---|
| 1. Evidence-driven fusion engine | 6 | 9 | 10 | 10 | 7 | 10 | 8 | 6 | 5 | 9 |
| 2. Cross-field consistency | 8 | 9 | 7 | 6 | 6 | 8 | 9 | 8 | 3 | 5 |
| 3. Screen-replay one-class detector | 7 | 4 | 7 | 6 | 4 (unproven) | 5 | 6 | 3 | 8 | 6 |
| 4. Privacy-preserving patch training | 3 | 6 | 6 | 3 | 6 | 4 | 7 | 5 | 6 | 4 |
| 5. Foundation-model fine-tune | 2 | 4 | 6 | 5 | 8 | 5 | 6 | 4 | 7 | 5 |

**Recommendation: build Innovation 1 as your headline, with Innovation 2 folded in as one of its input modules, and (only if ahead of schedule) attempt a scaled-down version of Innovation 3 for the demo's "wow" moment on screen-replay detection.** Do not lead with Innovation 4 or 5 — they're real ideas but they're someone else's already-published ideas, and a judge who's read the same SLR you were given will notice.

---

## PART 7 — WHAT KIND OF INNOVATION IS THIS, HONESTLY

Checked against your list: your innovation should be **"a combination of existing models into a novel pipeline" + "a new explainability layer" + "a new document/identity consistency engine."** It is explicitly **not**: a new model, an improved existing model, a new dataset (your self-generated set is a means, not the contribution), or a new evaluation methodology (you should use the field's existing ISO/IEC 30107-3 metrics — APCER/BPCER/EER, per Ruiz/Tapia/Busch — not invent your own).

This is the realistic, right-sized choice for a 6-member team on a hackathon clock: every individual component (OCR, MRZ checksum, SIFT copy-move, one-class SVM, face embeddings) is either literally described in Dai et al. or standard/off-the-shelf. Your actual engineering effort goes into integration, the fusion model, and — this is where the hackathon points are — explainability and honest uncertainty communication, both of which are cheap in engineering time relative to their demo impact.

---

## PART 8 — PROPOSED ARCHITECTURE

### Simple explanation (for a teammate or judge who isn't technical)
The user photographs their ID and takes a selfie. The app checks the photo is sharp enough, figures out what kind of document it is, reads the text off it, checks the barcode/MRZ, looks for signs the document was digitally or physically altered, checks the selfie is a real live person (not a photo of a photo or a screen), checks that person's face matches the ID photo, and checks the information on the document is internally consistent. All of that gets combined into one score with a plain-language list of *why* — not just a number — and a human reviewer only gets involved when the system isn't confident.

### Technical explanation

**Frontend:** Mobile-first web app (or React Native) — camera capture for document (front/back) + liveness selfie (short video/multi-angle for a Baweja-style liveness check), progress UI, and the final evidence dashboard.

**Backend:** FastAPI (Python — natural fit given OCR/CV/ML stack is all Python; avoids a second-language integration tax a Node.js backend would add for a 6-person team on a deadline).

**AI layer:**
- Document type classifier (MobileNetV2)
- OCR (EasyOCR/PaddleOCR)
- MRZ parser + checksum validator (rule-based)
- Copy-move detector (OpenCV SIFT + scikit-learn DBSCAN)
- Imitation-forgery detector (scikit-learn one-class SVM on OCR-derived character features)
- Face embedding model (pretrained ArcFace/FaceNet via `insightface` or similar) for face-doc match
- Liveness model (lightweight CNN + adaptive-Gaussian one-class head, adapted from Baweja et al.'s approach)
- Fusion model (scikit-learn logistic regression → Random Forest if data supports it)

**Document forensics layer:** copy-move + imitation-forgery + (stretch) recapture/screen detector, as above.

**OCR layer:** EasyOCR primary, Tesseract fallback; field-extraction post-processing (regex per document template).

**Identity verification layer:** face embedding similarity + liveness gate + cross-field consistency rules.

**Fraud/risk engine:** learned fusion (Part 9).

**Database:** PostgreSQL (structured: users, sessions, module scores, decisions, audit log). Not MongoDB — your schema is relational by nature (one document → many field extractions → many module scores → one decision), and Postgres gives you free referential integrity for the audit trail judges will ask about.

**Explainability layer:** evidence-aggregation service that turns raw module outputs into (a) a plain-language evidence list and (b) visual overlays (bounding boxes on suspicious regions, extending Dai et al.'s "forgery proof image").

**Human review layer:** simple queue UI for MEDIUM-risk cases; reviewer decision feeds back into the training set (a real, if small, feedback loop to show judges you understand the operational lifecycle, not just the model).

**Security layer:** document/selfie images encrypted at rest, deleted post-verification per data-minimization principle (mirrors Dai et al.'s GDPR-compliance framing), no raw ID numbers logged in plaintext.

**Deployment layer:** Docker Compose for the demo (backend + Postgres + a small model-serving container); no cloud GPU dependency required for the MVP — every model above except the face embedding backbone can run CPU-only at demo speed.

---

## PART 9 — RISK-SCORING ENGINE

**Decision: risk score, not binary FAKE/REAL** — directly justified by Dai et al.'s own architecture (they already output a continuous forgery score) and by Zhang et al.'s framing of fraud detection as inherently probabilistic, not deterministic.

**Component scores (each 0–1, higher = more suspicious):**
`doc_authenticity`, `ocr_consistency`, `mrz_consistency`, `visual_tampering` (copy-move + imitation), `face_match`, `liveness`, `cross_field_consistency`, `doc_quality_penalty`

**Fusion method comparison:**

| Method | Pros | Cons | Verdict for you |
|---|---|---|---|
| Weighted scoring (manual weights) | Trivial to implement, fully transparent | Exactly Dai et al.'s admitted weak point — arbitrary weights | Use only as v0 fallback |
| Logistic Regression | Learns weights from your labeled data, still interpretable (coefficients = feature importance), cheap to train on a small dataset | Assumes roughly linear relationship between evidence and risk | **Recommended starting point** |
| Random Forest | Captures non-linear interactions (e.g., "copy-move detected AND low doc quality" is worse than either alone), gives feature importance | Needs more data than logistic regression to avoid overfitting; less directly interpretable | **Recommended if your self-generated dataset is large enough (Part 11/12)** |
| XGBoost | Best raw accuracy potential of the classical options | Overkill for ~8 input features and a modest dataset; harder to explain to judges live | Not recommended for MVP |
| Neural network (small MLP) | Flexible | No accuracy advantage at this feature count/data scale, adds an explainability cost | Not recommended |
| Late fusion / attention-based multimodal fusion | State of the art in the broader literature | Needs far more training data than a hackathon team will have, and is the kind of complexity Part 7 explicitly warns against | Not recommended |

**Recommendation: start with logistic regression (fast, interpretable, defensible to judges as "the field's own stated future work — see Dai et al." per Part 6/Innovation 1), upgrade to Random Forest if your dataset (Part 12) is large enough to support it without overfitting, and stop there.** Thresholds: LOW (score < 0.3) → PASS, MEDIUM (0.3–0.7) → human review, HIGH (>0.7) → reject/flag — tune these on your validation set, not fixed a priori.

---

## PART 10 — EXPLAINABILITY

**Mechanism comparison:**

| Method | Fit for this system | Why |
|---|---|---|
| SHAP | Good, moderate effort | Works cleanly on logistic regression/Random Forest fusion outputs — gives per-decision feature attribution ("liveness contributed 40% of the risk score") |
| Grad-CAM | Good for the CV sub-models (copy-move, forgery classifiers) | Explicitly requested by Ruiz/Tapia/Busch as a baseline, though they also call for *more* than generic heatmaps |
| Anomaly maps | Good for one-class modules (liveness, imitation-forgery SVM) | Natural fit — one-class models already compute a distance-from-normal score per region |
| Confidence scores | Trivial, always include | Baseline requirement |
| Evidence aggregation (rule-based text) | **Best return on effort for a hackathon demo** | This is exactly what Dai et al. already do with their "forgery proof image" — you're extending a proven, judge-legible pattern, not inventing UX from scratch |
| Visual heatmaps | Good, moderate effort | Pair with SHAP/Grad-CAM outputs |

**Recommendation:** Lead with **evidence aggregation** (plain-language list: "MRZ inconsistency detected," "Face/document similarity: 42%," "Copy-move region flagged near date-of-birth field") with **visual overlays** (bounding boxes, directly modeled on Dai et al.'s existing forgery-proof image) as the primary judge-facing UI, and add **SHAP** on the fusion model as a secondary "why did the overall score land here" view. This combination is achievable in your timeline and directly answers Ruiz/Tapia/Busch's explicit call for "forensically-aware XAI" rather than a generic black-box percentage — while staying honest that you're not inventing a new XAI method, you're applying known ones well and consistently across every module, which none of your source papers do.

---

## PART 11 — DATASET STRATEGY

**Public datasets to actually use (per Ruiz/Tapia/Busch's own survey):**
- **MIDV-2020 / MIDV family** — largest, most standard mock-up benchmark; good for document detection/OCR/layout training even though it's not real documents
- **DLC2021** — good for print/screen attack training (laminated mock-ups)
- **SIDTD** — pre-built composite/digital forgery attacks on top of MIDV-2020, saves you building a forgery simulator from scratch
- **IDNet** — largest synthetic set (837K images), useful for pretraining/robustness even given its synthetic-utility caveats
- Public **face-PAD datasets** (Replay-Attack, OULU-NPU, Rose-Youtu, Spoof in Wild — from Baweja et al.) for the liveness module

**Self-generated dataset (necessary, and here's how to do it without real people's sensitive data — directly following Dai et al.'s own precedent):**
- Recruit teammates/volunteers with **explicit informed consent** to photograph their *own real* documents (or use expired/cancelled documents where legally permitted) — mirrors Dai et al.'s 5-country consortium approach at hackathon scale
- Where real documents aren't available/appropriate, generate **synthetic template documents** (invented names, invented but format-valid numbers, stock/AI-generated faces — not real people's photos) laid out on real document templates, then physically print and re-photograph them (as Syn-IDPASS and FantasyID do) — this gets you real print/scan/camera artifacts without real PII
- Build a **forgery simulator** (copy-move, character replacement, resize/rotate) as Dai et al. did — this is a proven, described-in-detail technique you can replicate directly
- **Be explicit with judges about the Synthetic Utility Gap (Ruiz/Tapia/Busch):** synthetic forgeries help you train and demo, but don't claim they prove real-world generalization — this honesty is itself a differentiator, since most competing teams won't mention it

---

## PART 12 — DATASET SPLIT & EXPERIMENT DESIGN

- **Train/val/test split:** standard 70/15/15, stratified by document type and attack type so no split is missing a category
- **Unseen document types:** hold out at least one entire document template/country from training, test on it only — this is the single most literature-relevant test you can run, since "limited transferability" is Zhang et al.'s most-cited open challenge
- **Unseen attack types:** hold out one forgery technique (e.g., train without character-imitation examples, test on them) to demonstrate generalization, echoing Baweja et al.'s one-class philosophy
- **Cross-domain testing:** test on documents captured with a different phone/lighting condition than training, per Ruiz/Tapia/Busch's repeated point about device/domain variability
- **Low-quality images:** deliberately include blurry/glare/low-res test cases and report accuracy degradation honestly, don't hide it
- **Generalization vs. memorization:** report accuracy separately on (a) in-distribution test set, (b) held-out document type, (c) held-out attack type. A judge who sees only (a) will assume memorization; showing all three, with (b)/(c) honestly lower, is exactly the kind of rigor Ruiz/Tapia/Busch's SLR is implicitly asking the whole field to adopt.

---

## PART 13 — BASELINES VS. YOUR SYSTEM

| System | Description | Expected relative performance |
|---|---|---|
| Baseline 1 | OCR + rule-based MRZ verification only | High precision on MRZ-tamper attacks, blind to copy-move/imitation/liveness |
| Baseline 2 | CNN-based forgery classifier only (binary real/fake on whole image) | Per field consensus (Zhang et al., Ruiz/Tapia/Busch), poor generalization to unseen attacks |
| Baseline 3 | OCR + CNN (no MRZ, no face, no fusion) | Better than either alone, still no explainability, no liveness |
| Baseline 4 | Multimodal, naive-average fusion (essentially **reproducing Dai et al.'s current system**) | Your most important baseline — you should be able to show your learned-fusion system beats naive averaging on your own data |
| **Your system** | Multimodal, learned fusion, evidence-driven explainability, cross-field consistency | Target: matches or beats Baseline 4 on accuracy, clearly beats it on explainability and on held-out-attack-type generalization |

**Metrics to report:** APCER, BPCER, EER (per ISO/IEC 30107-3, as used throughout Ruiz/Tapia/Busch) rather than plain accuracy — using the field's actual standard metric makes your evaluation instantly legible to any judge who's read the same literature, and it's more informative than accuracy alone (it separates "we reject too many real users" from "we accept too many fakes").

---

## PART 14 — FAILURE CASES / ADVERSARIAL TESTING PLAN (representative set)

| # | Attack | Detecting module | Detection probability (honest estimate) | Possible failure | Mitigation |
|---|---|---|---|---|---|
| 1 | Photocopy of real ID | Copy-move + quality gate | High | Very high-quality copiers | Texture/frequency analysis add-on |
| 2 | Screen replay of real ID photo | Recapture detector | **Low-Medium (field-wide hardest case)** | Moiré suppressed by high-PPI screen | Be honest in demo that this is your weakest point |
| 3 | Character replaced (DOB altered) | Imitation-forgery SVM | High | Skilled forger matches font well | Cross-field consistency catches age/DOB mismatch as backup |
| 4 | Copy-move (digit duplicated) | Copy-move detector | High (92% per Dai et al.) | Small/subtle edits | Ensemble with imitation detector |
| 5 | MRZ checksum spoofed correctly | MRZ validator | Low (checksum-valid ≠ field-valid) | Attacker who knows the algorithm | Cross-field consistency (MRZ DOB vs. printed DOB) |
| 6 | Selfie is a printed photo | Liveness module | Medium-High (per Baweja et al. results) | Print quality high | Add texture/depth cues if time allows |
| 7 | Selfie is a screen replay | Liveness module | Medium (per Baweja et al., screen attacks are harder than print for one-class methods too) | Same weakness as attack #2 | Flag as MEDIUM risk, route to human review rather than false-confident PASS |
| 8 | Face mask/deepfake selfie | Liveness module | Low-Medium (not covered by any paper in your set) | No mask/deepfake training data available to you | Explicitly scope as future work, don't overclaim |
| 9 | Genuine document, wrong person (stolen ID) | Face-doc match | High | — | Standard face-match, well-supported |
| 10 | Synthetic identity (invented person, real-format doc) | Cross-field consistency (weak signal) | Low | Hard without external identity database | Explicitly scope as "requires external DB integration," out of hackathon scope |
| 11 | Low-quality capture used to hide tampering | Quality gate | Medium | Attacker exploits leniency threshold | Reject-and-reshoot policy for below-threshold quality |
| 12 | Different document template than trained on | Doc-type classifier | Low (named field-wide gap) | Model has never seen the layout | Fallback to generic (template-agnostic) rule checks |
| 13 | AI-generated fully synthetic document | Multiple (weak individually) | Low | No training data available (per Ruiz/Tapia/Busch, an emerging under-solved attack) | Explicitly flag as future work |
| 14 | Adversarial noise perturbation on image | All CV modules | Low | Not evaluated in any of your papers | Out of scope for MVP; note as a known limitation |
| 15 | Face morphing on document photo | Face-doc match | Low-Medium | Morphed face partially matches both people | Note IDNet dataset (Ruiz/Tapia/Busch) as a future training source |
| 16 | Expired document presented as valid | Cross-field consistency (date check) | High | — | Simple rule, easy win |
| 17 | Document number doesn't match issuing-authority format | Cross-field consistency | High | Requires per-country rule table | Build incrementally, start with 2-3 supported countries |
| 18 | Reprinted/counterfeit template (not based on a real doc) | Doc forgery + doc-type classifier | Medium | Requires reference templates | Maintain a small reference-template library |
| 19 | User uploads someone else's already-approved session data (replay attack on the *system*, not the document) | Backend/session security | High if handled at API level | Not a CV problem at all | Session tokens, rate limiting — standard backend security |
| 20 | Combination attack (e.g., copy-move AND screen replay together) | Fusion engine | Depends on component scores | Individually-weak signals may not sum to HIGH risk | This is exactly why *learned* fusion (Random Forest, captures interactions) matters over naive averaging |

---

## PART 15 — RED-TEAMING YOUR OWN ARCHITECTURE (summary)

- **False positives:** aggressive quality gate + strict cross-field rules risk rejecting legitimate users with unusual-but-valid documents (e.g., legacy document formats, per Dai et al.'s own note about "legacy but still valid versions" of documents). Mitigation: MEDIUM-risk routing to human review rather than hard reject.
- **False negatives:** screen-replay and deepfake/mask liveness attacks are your acknowledged weak points (Parts 4, 14) — don't claim coverage you don't have.
- **Dataset leakage / overfitting:** with a small self-generated dataset, risk is high; enforce document-level (not just image-level) train/test splits so the same physical document never appears in both.
- **OCR errors:** cascade into false cross-field-inconsistency flags; add an OCR-confidence threshold before triggering consistency checks.
- **Document-template dependency:** your doc-type classifier will only know what you trained it on — be explicit in the demo about which countries/templates are supported.
- **Latency:** OCR + multiple CV models + face embedding could be slow on CPU; profile early, consider async processing with a "processing..." UI state for the demo rather than optimizing prematurely.
- **Privacy:** don't store raw document images longer than needed; this is both good practice and a strong judge-facing talking point given how repeatedly your literature (Zhang, Dai, Ruiz/Tapia/Busch) flags privacy as the field's core bottleneck.
- **Explainability problems:** make sure the evidence list never contradicts the final score (e.g., don't say "no issues found" and then output HIGH risk) — test this specific failure mode explicitly before the demo.

---

## PART 16 — 6-MEMBER TEAM PLAN

| Member | Focus | Technologies | Key deliverable |
|---|---|---|---|
| 1 | Document Forensics / CV | OpenCV, SIFT, scikit-learn | Copy-move + imitation-forgery detectors (replicate Dai et al.) |
| 2 | OCR / Document Processing | EasyOCR/Tesseract, regex, MRZ parsing | Field extraction + MRZ validator |
| 3 | Face / Liveness | insightface/ArcFace, adapted one-class liveness (Baweja et al.) | Face-doc match + liveness module |
| 4 | ML / Risk Engine | scikit-learn (LogReg → Random Forest), SHAP | Fusion model + explainability layer |
| 5 | Backend / Database / API | FastAPI, PostgreSQL, Docker | End-to-end API, session/security, human-review queue |
| 6 | Frontend / Integration / Deployment | React/React Native, camera capture UI | Capture flow, evidence dashboard, demo polish |

**Dependency order:** Member 2 (OCR/MRZ) and Member 1 (forgery detection) can start immediately in parallel using public datasets (MIDV/DLC2021/SIDTD). Member 3 (liveness) can start in parallel using public face-PAD datasets. Member 5 (backend) builds the API contract early so 1/2/3 can plug in independently. Member 4 (fusion/explainability) is necessarily downstream — needs real output from at least 2-3 modules before it has anything to fuse — so should spend early days building the evidence-schema and mock data pipeline, not waiting idle.

---

## PART 17 — TECHNOLOGY STACK

| Layer | Choice | Why (not just "popular") |
|---|---|---|
| AI framework | **PyTorch** | Better ecosystem for the pretrained face-embedding/classifier models you'll actually use (torchvision, insightface); TensorFlow adds no benefit here |
| Computer vision | **OpenCV** for SIFT/DBSCAN/image ops, **MobileNetV2** for doc-type classification | MobileNetV2 is exactly what Dai et al.'s own cited literature (Gonzalez et al., inside Ruiz/Tapia/Busch) uses for this task — proven lightweight fit |
| OCR | **EasyOCR** primary | LSTM-based, matches Dai et al.'s stack, easier Python integration than Tesseract for a fast build |
| Backend | **FastAPI** | Async support for the multi-model inference pipeline, auto-generated API docs (useful for a judge demo), Python-native (no CV/ML code needs to cross a language boundary) |
| Frontend | **React** (web) or **React Native** if mobile-native camera quality matters more than build speed | React web is faster to build and demo reliably in a hackathon setting |
| Database | **PostgreSQL** | Relational structure fits your data model (Part 8); free ACID guarantees for the audit trail |
| Deployment | **Docker Compose**, local/CPU inference | No cloud-GPU dependency needed for MVP-scale demo; removes a point of failure on demo day |

---

## PART 18 — 4-PHASE ROADMAP

**Phase 1 — Research + Baseline (mirrors Baseline 4 above):** literature review (done — this document), assemble MIDV/DLC2021/SIDTD + your own pilot dataset, build OCR+MRZ+naive-average baseline. *Success criteria:* reproduce something close to Dai et al.'s reported numbers on your own pilot set.

**Phase 2 — Core AI:** doc detection, forgery detection (copy-move + imitation), face-doc match, liveness. *Success criteria:* each module independently hits reasonable accuracy on its own validation split.

**Phase 3 — Innovation:** learned fusion engine + cross-field consistency module + explainability layer. *Success criteria:* fused system beats naive-average baseline on your held-out test set (this is your core research claim — measure it).

**Phase 4 — Integration + Evaluation:** full pipeline, risk dashboard, adversarial testing against your own Part 14 list, performance tuning, demo rehearsal. *Success criteria:* end-to-end demo runs reliably in under [your target latency] on the actual hardware you'll present with.

---

## PART 19 — MVP vs. FINAL SYSTEM

- **MVP:** OCR + MRZ + copy-move detection + naive-average score + basic pass/reject UI (essentially Baseline 4, working end to end)
- **Strong prototype (internal testing):** + imitation-forgery detector + face-doc match + learned (logistic regression) fusion + evidence list UI
- **Final SIH demo:** + liveness module + cross-field consistency + Random-Forest fusion (if data supports it) + full visual evidence overlays + human-review queue
- **Research-level future work (explicitly do NOT attempt during the hackathon):** screen-replay/recapture forensic detector at production quality, face-morph detection, synthetic-identity detection against external databases, foundation-model fine-tuning, federated/privacy-preserving training at scale, adversarial-robustness hardening

---

## PART 20 — JUDGE PERSPECTIVE (brutally honest)

Evaluated against problem understanding, innovation, technical complexity, real-world usefulness, scalability, accuracy, explainability, security, feasibility, and demo quality: your strongest cards are **explainability** (genuinely differentiated — you can point to Dai et al.'s own limitation and Ruiz/Tapia/Busch's explicit call for forensically-aware XAI, and show you addressed both) and **problem understanding** (you can articulate, with citations, exactly why document-forensics and face-liveness research haven't been combined, and why that matters). Your weakest cards, honestly: **accuracy** will not beat published state-of-the-art (you have neither the data scale of IDNet's 837K images nor the compute for foundation-model fine-tuning), and **novelty** is real but modest — you are integrating and improving fusion, not inventing new detection algorithms.

**Why should judges choose this over a normal OCR + fake-document classifier?** Because a normal classifier gives a single opaque percentage that a compliance officer or a judge can't act on or trust, generalizes badly to attack types it wasn't trained on (the single most-cited failure mode in your own literature), and treats face liveness and document forgery as unrelated problems even though a real attacker exploits both together. Your system's explicit, literature-grounded contribution is refusing to hide behind a percentage: every decision comes with the specific evidence that produced it, cross-checked across modalities that don't currently talk to each other anywhere in your source papers.

---

## PART 21 — FINAL UNIQUE VALUE PROPOSITION

> **Existing systems** treat document forgery detection, face liveness, and identity consistency as separate problems solved by separate models with no shared reasoning and, at best, a naive averaged score — **but our system** fuses them into one learned, evidence-driven risk engine that shows its reasoning at every step.

- **Core innovation (one sentence):** A learned, explainable multimodal fusion engine that combines document forensics, face liveness, face-document matching, and cross-field consistency — a combination absent from every paper in our review.
- **Technical differentiator (one sentence):** Every risk decision ships with a structured evidence trail (visual + textual) instead of a bare confidence percentage.
- **Research gap (one sentence):** No reviewed system combines document-forgery detection and face-liveness detection into one reasoned score, and none replace naive score-averaging with a learned, evaluated fusion model.
- **SIH differentiator (one sentence):** We built the module the field's own literature (Dai et al.) flagged as future work — learned fusion — and the module Zhang et al. flagged as an open gap — cross-field consistency — rather than re-announcing an already-published technique as new.
- **Why it's hard to copy (one sentence):** Copying the individual modules is easy (they're published); replicating the evidence-schema integration, the cross-field consistency logic, and the honestly-tuned fusion weights on real multimodal data is the actual engineering effort, and that's what a demo/judge Q&A will expose in a copycat team.

---

## PART 22 — FINAL SYSTEM BLUEPRINT

```
USER
  ↓
CAPTURE (document photo + liveness selfie)
  ↓
MODULE 1 — Quality Gate         Input: raw image → Model: heuristic (blur/glare) → Output: pass/reshoot
  ↓
MODULE 2 — Doc Type Classifier  Input: cropped doc → Model: MobileNetV2 → Output: template ID
  ↓
MODULE 3 — OCR + Fields         Input: doc image → Model: EasyOCR → Output: structured fields
  ↓
MODULE 4 — MRZ Validator        Input: MRZ region → Model: checksum rules → Output: valid/invalid
  ↓
MODULE 5 — Forgery Detection    Input: doc image → Model: SIFT+DBSCAN, one-class SVM → Output: tamper score + regions
  ↓
MODULE 6 — Face Extraction      Input: doc + selfie → Model: face detector → Output: 2 face crops
  ↓
MODULE 7 — Liveness             Input: selfie → Model: one-class CNN (adapted Baweja et al.) → Output: liveness score
  ↓
MODULE 8 — Face Match           Input: 2 face crops → Model: ArcFace embeddings → Output: similarity score
  ↓
MODULE 9 — Cross-Field Check    Input: structured fields → Model: rules + light anomaly detection → Output: consistency score
  ↓
RISK ENGINE — Logistic Regression / Random Forest fusion of Modules 4,5,7,8,9
  ↓
EXPLAINABLE DECISION — evidence list + overlays + LOW/MEDIUM/HIGH
  ↓
DASHBOARD (auto-pass, human review queue, or reject+flag)
```

---

## PART 23 — IMPLEMENTATION BACKLOG

**P0 — Must have (demo-critical):** capture UI, OCR+field extraction, MRZ validator, copy-move detector, naive-fusion score, pass/reject UI. *Owners:* 2, 1, 4, 6. *Difficulty:* Medium.

**P1 — Important:** imitation-forgery SVM, face-doc match, learned (logistic regression) fusion, evidence-list explainability UI, human-review queue. *Owners:* 1, 3, 4, 6, 5. *Difficulty:* Medium.

**P2 — Advanced (research value):** liveness module, cross-field consistency engine, Random Forest fusion + SHAP, visual overlay explainability, held-out-attack-type evaluation report. *Owners:* 3, 2, 4, 4, all. *Difficulty:* Medium-Hard.

**P3 — Future (do not implement unless far ahead of schedule):** screen-replay/recapture detector, face-morph detection, synthetic-identity checks, foundation-model fine-tune, federated/privacy-preserving training. *Difficulty:* Hard.

---

## PART 24 — FINAL RESEARCH ROADMAP (concise)

| Stage | What | Why | How | Expected result | Move on when... |
|---|---|---|---|---|---|
| Research | This document | Ground every claim in evidence, avoid reinventing published work | Read all 5 papers + PRISMA-style synthesis | Clear gap identified (Part 3) | Team agrees on the one gap to attack |
| Dataset | Public sets + self-generated pilot | Field-wide data scarcity (all 3 relevant papers) | MIDV/DLC2021/SIDTD + consented real docs + synthetic templates | Usable train/val/test split | You have ≥3 doc types, ≥3 attack types, held-out splits ready |
| Baseline | Reproduce Baseline 4 (naive fusion) | Establishes the exact bar you must beat | OCR+MRZ+copy-move+average | Working end-to-end pipeline | Baseline runs reliably, numbers recorded |
| Architecture | Full 9-module pipeline (Part 22) | Modular = parallelizable across 6 people | Build per Part 16 team plan | Each module independently validated | Every module has a measured accuracy number |
| Innovation | Learned fusion + explainability + cross-field checks | Your actual novelty (Part 6/21) | LogReg → Random Forest + evidence UI | Beats naive-average baseline, measurably | Fusion beats baseline on your held-out test set |
| Training | Fit models on your dataset | — | Standard train/val loop, document-level splits | Reasonable per-module accuracy | No leakage, validation stable |
| Testing | Held-out doc types + attack types + low quality | Prove generalization, not memorization (Part 12) | Report APCER/BPCER/EER per ISO 30107-3 | Honest, possibly lower, generalization numbers | You can defend every number in a judge Q&A |
| Red teaming | Your own Part 14/15 attack list | Think like an attacker before a judge does | Manual + scripted adversarial tests | Documented failure modes with mitigations | You can say, unprompted, "here's where we'd still fail" |
| Integration | Full app, dashboard, review queue | Judge-facing polish | Docker Compose, demo rehearsal | Reliable live demo | Runs 3x in a row without failure on demo hardware |
| Evaluation | Baseline comparison table | Prove the innovation, not just the app | Baseline 1-4 vs. your system, same metrics/splits | A clean, honest comparison chart | Numbers are ready to put on a slide |
| SIH Demo | Present | — | Lead with the gap → the fix → the evidence, per Part 21's UVP | Judges remember *why*, not just *what* | — |

---

## MOST IMPORTANT FINAL QUESTION — "If you had to win SIH26188, what exactly would you build?"

1. **Exact problem:** Fake/altered identity documents combined with spoofed selfies fool verification systems because forgery detection, face liveness, and cross-field consistency are checked separately or not at all, with the final decision reduced to an unexplained percentage.
2. **Exact research gap:** No paper in your literature set fuses document forgery, face liveness, face-document matching, and cross-field consistency into one learned, explainable risk score — every existing example either averages a couple of scores naively (Dai et al.) or doesn't combine domains at all (all other papers).
3. **Exact architecture:** The 9-module pipeline in Part 22.
4. **Exact unique innovation:** A learned (logistic regression → Random Forest) fusion engine over document-forensics + liveness + face-match + cross-field-consistency scores, with a structured, visual evidence trail per decision — replacing the naive averaging that the closest real-world precedent (Dai et al.) itself flags as unfinished.
5. **Exact AI/ML approach:** Off-the-shelf, proven components (SIFT+DBSCAN for copy-move, one-class SVM for imitation forgery and liveness, MobileNetV2 for doc-type classification, pretrained face-embedding model for matching) — the innovation is in fusion and explainability, not new architectures.
6. **Exact dataset strategy:** MIDV-2020/DLC2021/SIDTD for public pretraining + a small, consent-based, GDPR-mirroring self-collected pilot set (real teammate documents where appropriate, synthetic-template-on-real-substrate documents otherwise) + a Dai-et-al.-style forgery simulator.
7. **Exact evaluation methodology:** APCER/BPCER/EER per ISO/IEC 30107-3, reported separately for in-distribution, held-out document type, and held-out attack type, compared against 4 explicit baselines including a naive-average reproduction of Dai et al.
8. **Exact MVP:** OCR + MRZ + copy-move detection + naive fusion + pass/reject UI, working end to end.
9. **Exact final prototype:** All 9 modules + learned fusion + evidence-driven explainability dashboard + human-review queue.
10. **Biggest risks:** (a) self-generated dataset too small for the fusion model to learn meaningfully better weights than naive averaging — you might fail to beat your own baseline; (b) screen-replay/liveness spoofing remains weak, matching the field-wide unsolved case; (c) demo-day latency across 9 chained models.
11. **Mitigation:** (a) start collecting/generating data on day one, in parallel with module development, and have a documented fallback to weighted-averaging if the learned model doesn't clearly win; (b) be upfront about this limitation in the pitch rather than overclaiming — it's a credibility strength, not just a weakness, per Part 15; (c) profile early, use async processing and a visible "analyzing evidence..." UI state.
12. **What NOT to build:** foundation-model fine-tuning, polarization/hardware-based liveness (Tian et al. — infeasible on a phone), synthetic-identity detection against external databases, or anything claiming to "solve" screen-replay detection — these are explicitly out of scope per Part 19.
13. **Roadmap:** Part 18/24 above.
14. **Team division:** Part 16 above.
15. **Judge-facing differentiation:** "Every other team you'll see today either shows you a percentage or shows you one detector. We read the same literature you might have — it independently and repeatedly says nobody combines document forensics and face liveness into one reasoned decision, and that the closest real deployed system (an EU-funded project, not a paper — Dai et al. 2025) still averages its scores naively by its own admission. We built the thing their own paper says is future work, and we can show you, on our own held-out attack types, exactly where it helps and exactly where it still doesn't."

---

## QUALITY CONTROL — SELF-CHECK BEFORE YOU PRESENT

| Check | Answer |
|---|---|
| Are we reproducing an existing paper? | Partially, by design — Modules 3/4/5 closely follow Dai et al.'s published architecture. Say so openly; the value-add is fusion + explainability + cross-field checks, which are not published anywhere in this corpus. |
| Is the claimed innovation supported by the literature gap? | Yes — Part 3 traces it to specific, quoted limitations in Dai et al. and named gaps in Zhang et al. and Ruiz/Tapia/Busch. |
| Can 6 students implement the core system? | Yes — every P0/P1 component in Part 23 is either off-the-shelf or described step-by-step in Dai et al. |
| Can you demonstrate it reliably? | Yes, if you follow Part 18's phased build and rehearse per Part 24's "integration" row. |
| Can you evaluate it scientifically? | Yes — Part 12/13 give you a real held-out-type/attack-type protocol and named baselines, using the field's actual standard metrics. |
| Can it handle realistic attacks, not just clean data? | Partially — strong on copy-move/imitation/MRZ (per Dai et al.'s numbers), weak on screen-replay and deepfake, and you should say so unprompted. |
| Can the system explain flags? | Yes — this is your strongest, most literature-grounded differentiator. |
| Does it generalize to unseen documents? | Untested until you run Part 12's held-out-type protocol — don't claim it works until you've measured it. |
| Are we using too many models? | No — 9 modules sounds like a lot, but each is small/lightweight (MobileNetV2, SVMs, logistic regression); nothing here requires GPU-scale training, which keeps the system honestly matched to your team's resources. |
| Single strongest reason a judge remembers this project? | You can point to the exact sentence in a real, published, EU-funded 2025 system where the authors admit their fusion is naive — and show them the fixed version, with receipts. |
