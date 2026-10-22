import { EN_DOSSIER_PDF_LABELS, type DossierPdfLabels } from "@proofbridge/core";

/**
 * UI strings. English is the source of truth; French and Arabic must define every key (a test
 * enforces it). `{name}` placeholders are filled by `t(key, vars)`. Data the user typed
 * (evidence, listings, claims) is never translated.
 */
const en = {
  "shell.skip": "Skip to content",
  "shell.localOnly": "● Local-only",
  "shell.localOnlyTitle": "All data stays in this browser's IndexedDB. No account; AI assistance is off unless you opt in.",
  "shell.footer":
    "Records badged DEMO / SYNTHETIC are invented. Nothing here is formally verified; a hash proves byte integrity, not authenticity.",
  "shell.language": "Language",

  "nav.compass": "Compass",
  "nav.compass.desc": "Today’s next action and open evidence gaps",
  "nav.evidence": "Evidence Vault",
  "nav.evidence.desc": "Sources, artifacts and claims",
  "nav.opportunities": "Opportunity Lab",
  "nav.opportunities.desc": "Requirements and their evidence status",
  "nav.graph": "Proof Graph",
  "nav.graph.desc": "Evidence → claim → skill → requirement → opportunity → next step",
  "nav.plan": "Bridge Plan",
  "nav.plan.desc": "Small tasks that close evidence gaps",
  "nav.share": "Share Studio",
  "nav.share.desc": "Selective dossier export and vault backup",
  "nav.settings": "Settings",
  "nav.settings.desc": "Language and optional AI assistance",

  "status.supported": "Supported",
  "status.uncertain": "Uncertain",
  "status.not-yet-supported": "Not yet supported",
  "status.not-applicable": "Not applicable",
  "status.unknown": "Unknown",

  "data.loading": "Opening local vault…",
  "data.error": "Could not open the local database (IndexedDB): {message}",
  "demo.badge": "Demo / Synthetic",

  "compass.title": "Compass",
  "compass.lede":
    "One meaningful next action, your saved opportunities and open evidence gaps — all stored locally in this browser.",
  "compass.demoNotice": "You are viewing an explicitly synthetic demo vault. No real person or organization is represented.",
  "compass.resetDemo": "Reset demo data",
  "compass.nextAction": "Next action",
  "compass.noTasks": "No open tasks.",
  "compass.openPlan": "Open Bridge Plan",
  "compass.saved": "Saved opportunities",
  "compass.gaps": "Open evidence gaps ({n})",
  "compass.lastCapture": "Last evidence capture",
  "compass.nothingCaptured": "Nothing captured yet.",
  "compass.profile": "Your profile",

  "evidence.title": "Evidence Vault",
  "evidence.lede":
    "Sources, the artifacts captured from them and the claims each artifact supports. Select an artifact to inspect its provenance, coverage, redaction and change history.",
  "opportunities.title": "Opportunity Lab",
  "opportunities.lede":
    "Paste a listing; requirements are parsed and matched to your evidence deterministically, each with a reason and the claims behind it. You can reject a match, link evidence yourself or set a status. “Supported” means the vault holds evidence — not that anything is formally verified.",
  "opportunities.import": "Import an opportunity",
  "opportunities.col.requirement": "Requirement",
  "opportunities.col.status": "Status",
  "opportunities.col.why": "Why",
  "opportunities.aiOrigin": "AI-suggested, accepted by you",
  "graph.title": "Proof Graph",
  "graph.lede":
    "The accessible list view of every persisted path from evidence to next step, recomputed from the vault after every change. The interactive 2D graph will be drawn from these same relations.",
  "plan.title": "Bridge Plan",
  "plan.lede":
    "Small proposed tasks, each tied to one evidence gap. Effort estimates are editable guesses, not success probabilities. Time budgets and task completion are not built yet.",

  "share.title": "Share Studio",
  "share.lede":
    "Compose a selectively disclosed, opportunity-specific dossier for your review and export. Private and redacted evidence is never included. Nothing leaves this browser unless you download it.",
  "share.dossier": "Dossier",
  "share.backup": "Vault backup",
  "share.opportunity": "Opportunity",
  "share.noOpportunity": "Import an opportunity to compose a dossier.",
  "share.downloadJson": "Download dossier (JSON)",
  "share.downloadPdf": "Download dossier (PDF)",
  "share.retrieved": "retrieved {date}",
  "share.setManually": "(set manually)",
  "share.withheld": "{n} evidence item(s) withheld (private or redacted).",
  "share.pdfReplaced":
    "The PDF uses built-in fonts: {n} character(s) it cannot show were replaced with “?”. The JSON dossier keeps them exactly.",
  "share.pdfLabelsNote": "PDF labels are in English for this language: the built-in PDF fonts have no Arabic glyphs.",

  "settings.title": "Settings",
  "settings.lede": "Interface language and optional AI assistance. These preferences stay in this browser and are not part of vault backups.",
  "settings.language": "Interface language",
  "settings.ai": "AI assistance (optional)",
  "settings.ai.intro":
    "ProofBridge works fully without AI: parsing and matching are deterministic. You can opt in to requirement suggestions from a model you run yourself on this computer (an Ollama-compatible endpoint). Cloud providers are not supported.",
  "settings.ai.status.off": "Off — nothing is sent anywhere.",
  "settings.ai.status.on": "On — consent given for {origin} on {date}.",
  "settings.ai.endpoint": "Endpoint (must be on this machine)",
  "settings.ai.model": "Model",
  "settings.ai.egress":
    "What is sent if you turn this on: only the listing text you paste in Opportunity Lab, to the endpoint above, and only after you preview the exact request and click send. Never your evidence, claims, files, profile or backups. No background calls.",
  "settings.ai.consent": "I understand what is sent and want to enable AI suggestions",
  "settings.ai.enable": "Enable AI suggestions",
  "settings.ai.disable": "Turn off and withdraw consent",
  "settings.ai.save": "Save endpoint and model",
  "settings.ai.log": "Egress log (this browser)",
  "settings.ai.logEmpty": "Nothing has been sent.",
  "settings.ai.logEntry": "{at} · {origin}{path} · {bytes} bytes · fields: {fields} · {outcome}",
  "settings.ai.clearLog": "Clear log",

  "ai.panel": "Optional AI suggestions",
  "ai.off": "AI assistance is off. Requirements come from the deterministic parser only. You can opt in under Settings.",
  "ai.preview": "Preview the request",
  "ai.previewHelp": "This exact JSON will be sent to {url}. Nothing else leaves the browser.",
  "ai.send": "Send to local model",
  "ai.sending": "Asking the local model…",
  "ai.cancel": "Cancel",
  "ai.fallback": "Using the deterministic parser only: {reason}",
  "ai.none": "The model suggested nothing beyond the deterministic parse.",
  "ai.suggestions": "Suggestions (unverified — tick the ones to add as requirements)",
  "ai.needText": "Paste the listing text first.",
} as const;

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;

const fr: Messages = {
  "shell.skip": "Aller au contenu",
  "shell.localOnly": "● Local uniquement",
  "shell.localOnlyTitle":
    "Toutes les données restent dans l’IndexedDB de ce navigateur. Aucun compte ; l’assistance IA est désactivée sauf si vous l’activez.",
  "shell.footer":
    "Les éléments marqués DÉMO / SYNTHÉTIQUE sont inventés. Rien ici n’est formellement vérifié ; une empreinte prouve l’intégrité des octets, pas l’authenticité.",
  "shell.language": "Langue",

  "nav.compass": "Boussole",
  "nav.compass.desc": "Prochaine action du jour et lacunes de preuves",
  "nav.evidence": "Coffre de preuves",
  "nav.evidence.desc": "Sources, artefacts et affirmations",
  "nav.opportunities": "Labo d’opportunités",
  "nav.opportunities.desc": "Exigences et état de leurs preuves",
  "nav.graph": "Graphe de preuves",
  "nav.graph.desc": "Preuve → affirmation → compétence → exigence → opportunité → prochaine étape",
  "nav.plan": "Plan passerelle",
  "nav.plan.desc": "Petites tâches qui comblent les lacunes",
  "nav.share": "Studio de partage",
  "nav.share.desc": "Export sélectif du dossier et sauvegarde du coffre",
  "nav.settings": "Paramètres",
  "nav.settings.desc": "Langue et assistance IA facultative",

  "status.supported": "Étayée",
  "status.uncertain": "Incertaine",
  "status.not-yet-supported": "Pas encore étayée",
  "status.not-applicable": "Sans objet",
  "status.unknown": "Inconnue",

  "data.loading": "Ouverture du coffre local…",
  "data.error": "Impossible d’ouvrir la base locale (IndexedDB) : {message}",
  "demo.badge": "Démo / Synthétique",

  "compass.title": "Boussole",
  "compass.lede":
    "Une prochaine action utile, vos opportunités enregistrées et les lacunes de preuves — le tout stocké localement dans ce navigateur.",
  "compass.demoNotice":
    "Vous consultez un coffre de démonstration explicitement synthétique. Aucune personne ni organisation réelle n’y figure.",
  "compass.resetDemo": "Réinitialiser la démo",
  "compass.nextAction": "Prochaine action",
  "compass.noTasks": "Aucune tâche ouverte.",
  "compass.openPlan": "Ouvrir le plan passerelle",
  "compass.saved": "Opportunités enregistrées",
  "compass.gaps": "Lacunes de preuves ({n})",
  "compass.lastCapture": "Dernière capture de preuve",
  "compass.nothingCaptured": "Rien n’a encore été capturé.",
  "compass.profile": "Votre profil",

  "evidence.title": "Coffre de preuves",
  "evidence.lede":
    "Les sources, les artefacts qui en sont issus et les affirmations qu’ils étayent. Sélectionnez un artefact pour voir sa provenance, sa couverture, son masquage et son historique.",
  "opportunities.title": "Labo d’opportunités",
  "opportunities.lede":
    "Collez une offre : les exigences sont extraites et rapprochées de vos preuves de façon déterministe, chacune avec une raison et les affirmations associées. Vous pouvez rejeter un rapprochement, lier une preuve vous-même ou fixer un statut. « Étayée » signifie que le coffre contient des preuves — pas que quoi que ce soit soit formellement vérifié.",
  "opportunities.import": "Importer une opportunité",
  "opportunities.col.requirement": "Exigence",
  "opportunities.col.status": "Statut",
  "opportunities.col.why": "Pourquoi",
  "opportunities.aiOrigin": "Suggérée par l’IA, acceptée par vous",
  "graph.title": "Graphe de preuves",
  "graph.lede":
    "La vue en liste accessible de chaque chemin enregistré, de la preuve à la prochaine étape, recalculée après chaque modification. Le graphe 2D interactif s’appuiera sur ces mêmes relations.",
  "plan.title": "Plan passerelle",
  "plan.lede":
    "De petites tâches proposées, chacune liée à une lacune. Les estimations d’effort sont des suppositions modifiables, pas des probabilités de réussite. Budgets de temps et suivi des tâches ne sont pas encore disponibles.",

  "share.title": "Studio de partage",
  "share.lede":
    "Composez un dossier propre à une opportunité, à divulgation sélective, pour le relire et l’exporter. Les preuves privées ou masquées ne sont jamais incluses. Rien ne quitte ce navigateur sauf si vous le téléchargez.",
  "share.dossier": "Dossier",
  "share.backup": "Sauvegarde du coffre",
  "share.opportunity": "Opportunité",
  "share.noOpportunity": "Importez une opportunité pour composer un dossier.",
  "share.downloadJson": "Télécharger le dossier (JSON)",
  "share.downloadPdf": "Télécharger le dossier (PDF)",
  "share.retrieved": "récupérée le {date}",
  "share.setManually": "(fixé manuellement)",
  "share.withheld": "{n} élément(s) de preuve retenu(s) (privés ou masqués).",
  "share.pdfReplaced":
    "Le PDF utilise des polices intégrées : {n} caractère(s) non affichable(s) ont été remplacés par « ? ». Le dossier JSON les conserve à l’identique.",
  "share.pdfLabelsNote": "Les libellés du PDF sont en anglais pour cette langue : les polices PDF intégrées n’ont pas de glyphes arabes.",

  "settings.title": "Paramètres",
  "settings.lede":
    "Langue de l’interface et assistance IA facultative. Ces préférences restent dans ce navigateur et ne font pas partie des sauvegardes du coffre.",
  "settings.language": "Langue de l’interface",
  "settings.ai": "Assistance IA (facultative)",
  "settings.ai.intro":
    "ProofBridge fonctionne entièrement sans IA : l’extraction et le rapprochement sont déterministes. Vous pouvez activer des suggestions d’exigences provenant d’un modèle que vous exécutez vous-même sur cet ordinateur (point d’accès compatible Ollama). Les fournisseurs cloud ne sont pas pris en charge.",
  "settings.ai.status.off": "Désactivée — rien n’est envoyé nulle part.",
  "settings.ai.status.on": "Activée — consentement donné pour {origin} le {date}.",
  "settings.ai.endpoint": "Point d’accès (doit être sur cette machine)",
  "settings.ai.model": "Modèle",
  "settings.ai.egress":
    "Ce qui est envoyé si vous l’activez : uniquement le texte de l’offre que vous collez dans le Labo d’opportunités, vers le point d’accès ci-dessus, et seulement après avoir prévisualisé la requête exacte et cliqué sur envoyer. Jamais vos preuves, affirmations, fichiers, profil ou sauvegardes. Aucun appel en arrière-plan.",
  "settings.ai.consent": "Je comprends ce qui est envoyé et je veux activer les suggestions IA",
  "settings.ai.enable": "Activer les suggestions IA",
  "settings.ai.disable": "Désactiver et retirer le consentement",
  "settings.ai.save": "Enregistrer le point d’accès et le modèle",
  "settings.ai.log": "Journal des envois (ce navigateur)",
  "settings.ai.logEmpty": "Rien n’a été envoyé.",
  "settings.ai.logEntry": "{at} · {origin}{path} · {bytes} octets · champs : {fields} · {outcome}",
  "settings.ai.clearLog": "Effacer le journal",

  "ai.panel": "Suggestions IA facultatives",
  "ai.off":
    "L’assistance IA est désactivée. Les exigences proviennent uniquement de l’analyseur déterministe. Vous pouvez l’activer dans les Paramètres.",
  "ai.preview": "Prévisualiser la requête",
  "ai.previewHelp": "Ce JSON exact sera envoyé à {url}. Rien d’autre ne quitte le navigateur.",
  "ai.send": "Envoyer au modèle local",
  "ai.sending": "Interrogation du modèle local…",
  "ai.cancel": "Annuler",
  "ai.fallback": "Analyseur déterministe uniquement : {reason}",
  "ai.none": "Le modèle n’a rien suggéré de plus que l’analyse déterministe.",
  "ai.suggestions": "Suggestions (non vérifiées — cochez celles à ajouter comme exigences)",
  "ai.needText": "Collez d’abord le texte de l’offre.",
};

const ar: Messages = {
  "shell.skip": "انتقل إلى المحتوى",
  "shell.localOnly": "● محلي فقط",
  "shell.localOnlyTitle": "تبقى كل البيانات في IndexedDB الخاص بهذا المتصفح. لا حساب؛ والمساعدة بالذكاء الاصطناعي متوقفة ما لم تفعّلها.",
  "shell.footer":
    "السجلات الموسومة «تجريبي / اصطناعي» مختلَقة. لا شيء هنا موثَّق رسميًا؛ البصمة تثبت سلامة البايتات لا أصالتها.",
  "shell.language": "اللغة",

  "nav.compass": "البوصلة",
  "nav.compass.desc": "الخطوة التالية لليوم وثغرات الأدلة المفتوحة",
  "nav.evidence": "خزنة الأدلة",
  "nav.evidence.desc": "المصادر والمواد والادعاءات",
  "nav.opportunities": "مختبر الفرص",
  "nav.opportunities.desc": "المتطلبات وحالة أدلتها",
  "nav.graph": "مخطط الإثبات",
  "nav.graph.desc": "دليل ← ادعاء ← مهارة ← متطلب ← فرصة ← خطوة تالية",
  "nav.plan": "خطة الجسر",
  "nav.plan.desc": "مهام صغيرة تسدّ ثغرات الأدلة",
  "nav.share": "استوديو المشاركة",
  "nav.share.desc": "تصدير انتقائي للملف ونسخة احتياطية للخزنة",
  "nav.settings": "الإعدادات",
  "nav.settings.desc": "اللغة والمساعدة الاختيارية بالذكاء الاصطناعي",

  "status.supported": "مدعوم",
  "status.uncertain": "غير مؤكد",
  "status.not-yet-supported": "غير مدعوم بعد",
  "status.not-applicable": "لا ينطبق",
  "status.unknown": "غير معروف",

  "data.loading": "جارٍ فتح الخزنة المحلية…",
  "data.error": "تعذّر فتح قاعدة البيانات المحلية (IndexedDB): {message}",
  "demo.badge": "تجريبي / اصطناعي",

  "compass.title": "البوصلة",
  "compass.lede": "خطوة تالية مفيدة واحدة، وفرصك المحفوظة، وثغرات الأدلة المفتوحة — وكلها مخزنة محليًا في هذا المتصفح.",
  "compass.demoNotice": "أنت تتصفح خزنة تجريبية اصطناعية صراحةً. لا تمثّل أي شخص أو منظمة حقيقية.",
  "compass.resetDemo": "إعادة ضبط البيانات التجريبية",
  "compass.nextAction": "الخطوة التالية",
  "compass.noTasks": "لا مهام مفتوحة.",
  "compass.openPlan": "افتح خطة الجسر",
  "compass.saved": "الفرص المحفوظة",
  "compass.gaps": "ثغرات الأدلة المفتوحة ({n})",
  "compass.lastCapture": "آخر التقاط لدليل",
  "compass.nothingCaptured": "لم يُلتقط شيء بعد.",
  "compass.profile": "ملفك الشخصي",

  "evidence.title": "خزنة الأدلة",
  "evidence.lede": "المصادر والمواد الملتقطة منها والادعاءات التي تدعمها كل مادة. اختر مادة لتفحص مصدرها وتغطيتها وحجبها وسجل تغييراتها.",
  "opportunities.title": "مختبر الفرص",
  "opportunities.lede":
    "الصق إعلانًا؛ تُستخرج المتطلبات وتُطابَق مع أدلتك بطريقة حتمية، ولكلٍّ منها سبب والادعاءات التي تسنده. يمكنك رفض مطابقة أو ربط دليل بنفسك أو تحديد الحالة. «مدعوم» يعني أن الخزنة تحوي أدلة — لا أن شيئًا موثَّق رسميًا.",
  "opportunities.import": "استيراد فرصة",
  "opportunities.col.requirement": "المتطلب",
  "opportunities.col.status": "الحالة",
  "opportunities.col.why": "السبب",
  "opportunities.aiOrigin": "اقترحه الذكاء الاصطناعي وقبلتَه",
  "graph.title": "مخطط الإثبات",
  "graph.lede":
    "عرض قائمة سهل الوصول لكل مسار محفوظ من الدليل إلى الخطوة التالية، يُعاد حسابه بعد كل تغيير. سيُرسم المخطط التفاعلي ثنائي الأبعاد من العلاقات نفسها.",
  "plan.title": "خطة الجسر",
  "plan.lede":
    "مهام صغيرة مقترحة، كل منها مرتبطة بثغرة واحدة. تقديرات الجهد تخمينات قابلة للتعديل، لا احتمالات نجاح. ميزانيات الوقت وإكمال المهام غير متوفرة بعد.",

  "share.title": "استوديو المشاركة",
  "share.lede":
    "أنشئ ملفًا خاصًا بفرصة بعينها مع إفصاح انتقائي لمراجعته وتصديره. لا تُضمَّن الأدلة الخاصة أو المحجوبة أبدًا. لا شيء يغادر هذا المتصفح إلا إذا نزّلته.",
  "share.dossier": "الملف",
  "share.backup": "نسخة احتياطية للخزنة",
  "share.opportunity": "الفرصة",
  "share.noOpportunity": "استورد فرصة لإنشاء ملف.",
  "share.downloadJson": "تنزيل الملف (JSON)",
  "share.downloadPdf": "تنزيل الملف (PDF)",
  "share.retrieved": "استُرجعت في {date}",
  "share.setManually": "(حُدّدت يدويًا)",
  "share.withheld": "حُجب {n} من عناصر الأدلة (خاصة أو محجوبة).",
  "share.pdfReplaced": "يستخدم ملف PDF خطوطًا مدمجة: استُبدل {n} من المحارف التي لا يمكن عرضها بـ «?». يحتفظ ملف JSON بها كما هي.",
  "share.pdfLabelsNote": "عناوين ملف PDF بالإنجليزية لهذه اللغة: خطوط PDF المدمجة لا تحتوي على حروف عربية.",

  "settings.title": "الإعدادات",
  "settings.lede": "لغة الواجهة والمساعدة الاختيارية بالذكاء الاصطناعي. تبقى هذه التفضيلات في هذا المتصفح وليست جزءًا من النسخ الاحتياطية للخزنة.",
  "settings.language": "لغة الواجهة",
  "settings.ai": "المساعدة بالذكاء الاصطناعي (اختيارية)",
  "settings.ai.intro":
    "يعمل ProofBridge كليًا دون ذكاء اصطناعي: الاستخراج والمطابقة حتميان. يمكنك تفعيل اقتراحات المتطلبات من نموذج تشغّله بنفسك على هذا الحاسوب (نقطة وصول متوافقة مع Ollama). مزودو الخدمات السحابية غير مدعومين.",
  "settings.ai.status.off": "متوقفة — لا يُرسل أي شيء إلى أي مكان.",
  "settings.ai.status.on": "مفعّلة — أُعطيت الموافقة لـ {origin} في {date}.",
  "settings.ai.endpoint": "نقطة الوصول (يجب أن تكون على هذا الجهاز)",
  "settings.ai.model": "النموذج",
  "settings.ai.egress":
    "ما يُرسل إذا فعّلتها: نص الإعلان الذي تلصقه في مختبر الفرص فقط، إلى نقطة الوصول أعلاه، وفقط بعد أن تعاين الطلب الدقيق وتنقر إرسال. لا تُرسل أبدًا أدلتك أو ادعاءاتك أو ملفاتك أو ملفك الشخصي أو نسخك الاحتياطية. لا استدعاءات في الخلفية.",
  "settings.ai.consent": "أفهم ما يُرسل وأريد تفعيل اقتراحات الذكاء الاصطناعي",
  "settings.ai.enable": "تفعيل اقتراحات الذكاء الاصطناعي",
  "settings.ai.disable": "إيقاف وسحب الموافقة",
  "settings.ai.save": "حفظ نقطة الوصول والنموذج",
  "settings.ai.log": "سجل الإرسال (هذا المتصفح)",
  "settings.ai.logEmpty": "لم يُرسل أي شيء.",
  "settings.ai.logEntry": "{at} · {origin}{path} · {bytes} بايت · الحقول: {fields} · {outcome}",
  "settings.ai.clearLog": "مسح السجل",

  "ai.panel": "اقتراحات اختيارية بالذكاء الاصطناعي",
  "ai.off": "المساعدة بالذكاء الاصطناعي متوقفة. تأتي المتطلبات من المحلل الحتمي فقط. يمكنك تفعيلها من الإعدادات.",
  "ai.preview": "معاينة الطلب",
  "ai.previewHelp": "سيُرسل JSON هذا بالضبط إلى {url}. لا شيء آخر يغادر المتصفح.",
  "ai.send": "إرسال إلى النموذج المحلي",
  "ai.sending": "جارٍ سؤال النموذج المحلي…",
  "ai.cancel": "إلغاء",
  "ai.fallback": "استخدام المحلل الحتمي فقط: {reason}",
  "ai.none": "لم يقترح النموذج شيئًا يتجاوز التحليل الحتمي.",
  "ai.suggestions": "اقتراحات (غير موثّقة — حدّد ما تريد إضافته كمتطلبات)",
  "ai.needText": "الصق نص الإعلان أولًا.",
};

export const MESSAGES = { en, fr, ar } as const satisfies Record<string, Messages>;

const FR_PDF_LABELS: DossierPdfLabels = {
  heading: "Dossier d’opportunité",
  generated: "Généré",
  opportunity: "Opportunité",
  source: "Source",
  retrieved: "récupérée le",
  counts: "Statut des exigences",
  requirements: "Exigences et preuves",
  status: {
    supported: fr["status.supported"],
    uncertain: fr["status.uncertain"],
    "not-yet-supported": fr["status.not-yet-supported"],
    "not-applicable": fr["status.not-applicable"],
    unknown: fr["status.unknown"],
  },
  setManually: "statut fixé manuellement",
  suggestedByAi: "exigence suggérée par l’IA, acceptée par le titulaire",
  noEvidence: "Aucune preuve partagée.",
  artifact: "Artefact",
  captured: "capturé le",
  sha256: "SHA-256",
  excerpt: "Extrait",
  withheld: "{n} élément(s) de preuve retenu(s) (privés ou masqués).",
  page: "Page {n} sur {total}",
};

/** PDF labels per UI locale. Arabic falls back to English: the built-in PDF fonts lack Arabic glyphs. */
export const PDF_LABELS = { en: EN_DOSSIER_PDF_LABELS, fr: FR_PDF_LABELS, ar: EN_DOSSIER_PDF_LABELS } as const;
