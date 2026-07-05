(() => {
  "use strict";

  const STORAGE_NAMESPACE = "timorCrestDemo.v2";
  const DATA_KEY = `${STORAGE_NAMESPACE}:data`;
  const SESSION_KEY = `${STORAGE_NAMESPACE}:session`;

  const CONTRACTOR_LOGIN_ERROR = "호수 또는 비밀번호가 올바르지 않습니다.";
  const ADMIN_LOGIN_ERROR = "Admin 계정 정보가 올바르지 않습니다.";

  // Demo security boundary: this static auth/storage is mock localStorage only.
  // Production must use server auth, database row permissions, password hashing,
  // and file access control lists instead of browser-readable credentials/data.
  const seedData = () => ({
    version: STORAGE_NAMESPACE,
    adminUsers: [{ adminId: "admin", password: "admin1234" }],
    units: [
      {
        unitId: "A-101",
        building: "A",
        roomNumber: "101",
        contractorName: "KIM",
        contractDate: "2026-07-04",
        contractStatus: "계약 완료",
        loginPassword: "1234",
        phone: "010-1000-0101",
        memo: "Demo contractor A-101",
        floorPlan: "Timor Signature 84A",
        finishPackage: "Coastal Oak Package",
      },
      {
        unitId: "A-102",
        building: "A",
        roomNumber: "102",
        contractorName: "LEE",
        contractDate: "2026-07-05",
        contractStatus: "계약 진행",
        loginPassword: "5678",
        phone: "010-1000-0102",
        memo: "Demo contractor A-102",
        floorPlan: "Timor Signature 84B",
        finishPackage: "Stone Bright Package",
      },
      {
        unitId: "B-201",
        building: "B",
        roomNumber: "201",
        contractorName: "PARK",
        contractDate: "2026-07-06",
        contractStatus: "계약 완료",
        loginPassword: "9012",
        phone: "010-1000-0201",
        memo: "Demo contractor B-201",
        floorPlan: "Timor Terrace 99A",
        finishPackage: "Harbor White Package",
      },
    ],
    journeyTemplate: [
      stage(1, "BOOKING FEE", "완료", 100, "2026-07-01", "2026-07-01", "Booking fee 입금과 계약 접수가 완료되었습니다."),
      stage(2, "8주 이내 계약금", "진행 중", 60, "2026-08-30", "", "계약금 납부 및 공급계약 확인 단계입니다."),
      stage(3, "기초공사 완료", "예정", 0, "2026-10-20", "", "기초공사 완료 시점에 맞춰 안내가 제공됩니다."),
      stage(4, "골조 완료", "예정", 0, "2026-12-20", "", "골조 완료 후 다음 납부 차수가 열립니다."),
      stage(5, "벽체 완료", "대기", 0, "2027-02-20", "", "벽체 완료 일정은 현장 진행에 따라 갱신됩니다."),
      stage(6, "지붕 천장 완료", "대기", 0, "2027-04-20", "", "지붕과 천장 마감 전 점검 안내가 표시됩니다."),
      stage(7, "문 / 창호 / 전기 완료", "대기", 0, "2027-06-20", "", "주요 설비 완료 후 확인 문서가 공개됩니다."),
      stage(8, "입주 전", "대기", 0, "2027-08-31", "", "입주 전 점검과 잔금 안내가 제공됩니다."),
    ],
    paymentDataByUnit: {
      "A-101": payment("KIM", "Timor Demo Bank", "000-101-0000", "Manager Lee", "010-9000-0101", 640000000),
      "A-102": payment("LEE", "Timor Demo Bank", "000-102-0000", "Manager Han", "010-9000-0102", 620000000),
      "B-201": payment("PARK", "Harbor Demo Bank", "000-201-0000", "Manager Choi", "010-9000-0201", 700000000),
    },
    documentsByUnit: {
      "A-101": docs("A-101", "KIM"),
      "A-102": docs("A-102", "LEE"),
      "B-201": docs("B-201", "PARK"),
    },
    activity: [{ at: isoNow(), message: "Demo data seeded" }],
  });

  function stage(stepId, title, status, progress, scheduledDate, completedDate, description) {
    return { stepId, title, status, progress, scheduledDate, completedDate, description };
  }

  function payment(contractorName, bankName, accountNumber, bankManagerName, bankManagerPhone, totalPrice) {
    const rows = [
      row(1, "BOOKING FEE", "2026-07-01", 10000000, 10000000, "납입 완료"),
      row(2, "8주 이내 계약금", "2026-08-30", 50000000, 30000000, "일부 납입"),
      row(3, "기초공사 완료", "2026-10-20", 90000000, 0, "납입 예정"),
      row(4, "골조 완료", "2026-12-20", 90000000, 0, "납입 예정"),
      row(5, "벽체 완료", "2027-02-20", 90000000, 0, "납입 예정"),
      row(6, "지붕 천장 완료", "2027-04-20", 90000000, 0, "납입 예정"),
      row(7, "문 / 창호 / 전기 완료", "2027-06-20", 90000000, 0, "납입 예정"),
      row(8, "입주 전", "2027-08-31", 130000000, 0, "납입 예정"),
    ];
    return { contractorName, bankName, accountNumber, bankManagerName, bankManagerPhone, totalPrice, paymentSchedule: rows };
  }

  function row(stepId, title, dueDate, requiredAmount, paidAmount, status) {
    return { stepId, title, dueDate, requiredAmount, paidAmount, unpaidAmount: Math.max(requiredAmount - paidAmount, 0), status, memo: "" };
  }

  function docs(unitId, name) {
    return [
      doc(`${unitId}-contract`, "분양 계약서", "계약서", `${unitId.toLowerCase()}-contract-demo.pdf`, `${name} contractor demo contract metadata`, "2026-07-04", true),
      doc(`${unitId}-receipt`, "계약금 영수증", "납부 문서", `${unitId.toLowerCase()}-receipt-demo.pdf`, "Demo receipt metadata only", "2026-07-05", true),
      doc(`${unitId}-guide`, "입주 안내문", "안내문", `${unitId.toLowerCase()}-movein-guide-demo.pdf`, "Move-in guide placeholder", "2026-07-06", true),
      doc(`${unitId}-hidden`, "관리자 내부 메모", "기타", `${unitId.toLowerCase()}-internal-demo.pdf`, "Hidden admin-only metadata", "2026-07-07", false),
    ];
  }

  function doc(documentId, title, type, fileName, description, uploadedAt, isVisibleToUser) {
    return { documentId, title, type, fileName, description, uploadedAt, isVisibleToUser };
  }

  function isoNow() {
    return new Date().toISOString();
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function readData() {
    try {
      const raw = localStorage.getItem(DATA_KEY);
      if (!raw) return writeSeed("missing seed");
      const parsed = JSON.parse(raw);
      if (!isValidData(parsed)) return writeSeed("invalid schema");
      return parsed;
    } catch (_error) {
      return writeSeed("corrupt storage");
    }
  }

  function isValidData(data) {
    return Boolean(
      data &&
        data.version === STORAGE_NAMESPACE &&
        Array.isArray(data.units) &&
        Array.isArray(data.journeyTemplate) &&
        data.paymentDataByUnit &&
        data.documentsByUnit &&
        data.units.some((unit) => unit.unitId === "A-101") &&
        data.units.some((unit) => unit.unitId === "A-102") &&
        data.units.some((unit) => unit.unitId === "B-201"),
    );
  }

  function writeSeed(reason) {
    const data = seedData();
    data.activity.unshift({ at: isoNow(), message: `Storage fallback: ${reason}` });
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
    localStorage.removeItem(SESSION_KEY);
    return data;
  }

  function saveData(data) {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
  }

  function findUnit(data, unitId) {
    return data.units.find((unit) => unit.unitId === unitId) || null;
  }

  function normalizeUnit(input) {
    return {
      unitId: String(input.unitId || "").trim().toUpperCase(),
      building: String(input.building || "").trim(),
      roomNumber: String(input.roomNumber || "").trim(),
      contractorName: String(input.contractorName || "").trim(),
      contractDate: String(input.contractDate || "").trim(),
      contractStatus: String(input.contractStatus || "").trim(),
      loginPassword: String(input.loginPassword || "").trim(),
      phone: String(input.phone || "").trim(),
      memo: String(input.memo || "").trim(),
      floorPlan: String(input.floorPlan || "").trim(),
      finishPackage: String(input.finishPackage || "").trim(),
    };
  }

  function assertValidUnit(data, unit, originalUnitId) {
    if (!unit.unitId || !unit.building || !unit.roomNumber || !unit.contractorName || !unit.loginPassword) {
      throw new Error("호수, 동, 방, 계약자명, 비밀번호는 필수입니다.");
    }
    if (unit.contractDate && !/^\d{4}-\d{2}-\d{2}$/.test(unit.contractDate)) throw new Error("계약일은 YYYY-MM-DD 형식이어야 합니다.");
    if (data.units.some((item) => item.unitId === unit.unitId && item.unitId !== originalUnitId)) throw new Error("이미 존재하는 호수입니다.");
  }

  function record(data, message) {
    data.activity.unshift({ at: isoNow(), message });
    data.activity = data.activity.slice(0, 30);
  }

  function withData(update) {
    const data = readData();
    const result = update(data);
    saveData(data);
    return clone(result);
  }

  function paymentSummary(paymentData) {
    const paidAmount = paymentData.paymentSchedule.reduce((sum, item) => sum + Number(item.paidAmount || 0), 0);
    const requiredAmount = paymentData.paymentSchedule.reduce((sum, item) => sum + Number(item.requiredAmount || 0), 0);
    const remainingAmount = Math.max(Number(paymentData.totalPrice || 0) - paidAmount, 0);
    const unpaidAmount = paymentData.paymentSchedule.reduce((sum, item) => sum + Math.max(Number(item.requiredAmount || 0) - Number(item.paidAmount || 0), 0), 0);
    const progress = paymentData.totalPrice > 0 ? Math.min(Math.round((paidAmount / paymentData.totalPrice) * 100), 100) : 0;
    return { paidAmount, requiredAmount, remainingAmount, unpaidAmount, progress };
  }

  function hydratePaymentRows(paymentData) {
    paymentData.paymentSchedule.forEach((item) => {
      item.requiredAmount = Math.max(Number(item.requiredAmount || 0), 0);
      item.paidAmount = Math.max(Number(item.paidAmount || 0), 0);
      item.unpaidAmount = Math.max(item.requiredAmount - item.paidAmount, 0);
    });
    return paymentData;
  }

  const authService = {
    loginContractor(unitId, password) {
      const data = readData();
      const unit = findUnit(data, String(unitId || "").trim().toUpperCase());
      if (!unit || unit.loginPassword !== String(password || "")) return { ok: false, error: CONTRACTOR_LOGIN_ERROR };
      const session = { role: "contractor", unitId: unit.unitId };
      this.setSession(session);
      return { ok: true, session: clone(session) };
    },
    loginAdmin(adminId, password) {
      const data = readData();
      const admin = data.adminUsers.find((item) => item.adminId === String(adminId || "").trim() && item.password === String(password || ""));
      if (!admin) return { ok: false, error: ADMIN_LOGIN_ERROR };
      const session = { role: "admin" };
      this.setSession(session);
      return { ok: true, session: clone(session) };
    },
    getSession() {
      try {
        const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
        if (!session || !["contractor", "admin"].includes(session.role)) return null;
        if (session.role === "contractor" && !unitService.getUnit(session.unitId)) {
          this.logout();
          return null;
        }
        return clone(session);
      } catch (_error) {
        this.logout();
        return null;
      }
    },
    setSession(session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    },
    logout() {
      localStorage.removeItem(SESSION_KEY);
    },
    requireContractorUnit() {
      const session = this.getSession();
      if (!session || session.role !== "contractor") return null;
      return unitService.getUnit(session.unitId);
    },
    isAdmin() {
      const session = this.getSession();
      return Boolean(session && session.role === "admin");
    },
  };

  const unitService = {
    listUnits() {
      return clone(readData().units);
    },
    searchUnits(query) {
      const needle = String(query || "").trim().toLowerCase();
      return this.listUnits().filter((unit) => [unit.unitId, unit.contractorName, unit.phone, unit.memo].some((value) => String(value).toLowerCase().includes(needle)));
    },
    getUnit(unitId) {
      const unit = findUnit(readData(), unitId);
      return unit ? clone(unit) : null;
    },
    createUnit(input) {
      return withData((data) => {
        const unit = normalizeUnit(input);
        assertValidUnit(data, unit, "");
        data.units.push(unit);
        data.paymentDataByUnit[unit.unitId] = payment(unit.contractorName, "Demo Bank", `000-${unit.roomNumber}-0000`, "Demo Manager", "010-9000-0000", 600000000);
        data.documentsByUnit[unit.unitId] = [];
        record(data, `Created unit ${unit.unitId}`);
        return unit;
      });
    },
    updateUnit(unitId, input) {
      return withData((data) => {
        const original = findUnit(data, unitId);
        if (!original) throw new Error("호수를 찾을 수 없습니다.");
        const next = { ...original, ...normalizeUnit({ ...original, ...input }) };
        assertValidUnit(data, next, unitId);
        Object.assign(original, next);
        if (next.unitId !== unitId) {
          data.paymentDataByUnit[next.unitId] = data.paymentDataByUnit[unitId];
          data.documentsByUnit[next.unitId] = data.documentsByUnit[unitId] || [];
          delete data.paymentDataByUnit[unitId];
          delete data.documentsByUnit[unitId];
        }
        if (data.paymentDataByUnit[next.unitId]) data.paymentDataByUnit[next.unitId].contractorName = next.contractorName;
        record(data, `Updated unit ${next.unitId}`);
        return next;
      });
    },
    deleteUnit(unitId) {
      return withData((data) => {
        data.units = data.units.filter((unit) => unit.unitId !== unitId);
        delete data.paymentDataByUnit[unitId];
        delete data.documentsByUnit[unitId];
        const session = authService.getSession();
        if (session && session.role === "contractor" && session.unitId === unitId) authService.logout();
        record(data, `Deleted unit ${unitId}`);
        return true;
      });
    },
  };

  const journeyService = {
    listTemplateStages() {
      return clone(readData().journeyTemplate);
    },
    getJourneyForUnit(unitId) {
      if (!unitService.getUnit(unitId)) return [];
      return this.listTemplateStages();
    },
    updateTemplateStage(stepId, input) {
      return withData((data) => {
        const stageItem = data.journeyTemplate.find((item) => item.stepId === Number(stepId));
        if (!stageItem) throw new Error("공정 단계를 찾을 수 없습니다.");
        const status = ["대기", "예정", "진행 중", "완료"].includes(input.status) ? input.status : stageItem.status;
        Object.assign(stageItem, {
          title: String(input.title || stageItem.title).trim(),
          status,
          progress: Math.max(0, Math.min(Number(input.progress || 0), 100)),
          scheduledDate: String(input.scheduledDate || "").trim(),
          completedDate: String(input.completedDate || "").trim(),
          description: String(input.description || "").trim(),
        });
        record(data, `Updated journey ${stageItem.title}`);
        return stageItem;
      });
    },
    calculateOverallProgress(stages) {
      if (!stages.length) return 0;
      return Math.round(stages.reduce((sum, item) => sum + Number(item.progress || 0), 0) / stages.length);
    },
  };

  const paymentService = {
    getPayment(unitId) {
      const data = readData();
      const unitPayment = data.paymentDataByUnit[unitId];
      return unitPayment ? clone(hydratePaymentRows(unitPayment)) : null;
    },
    updatePayment(unitId, input) {
      return withData((data) => {
        const unitPayment = data.paymentDataByUnit[unitId];
        if (!unitPayment) throw new Error("납부 정보를 찾을 수 없습니다.");
        Object.assign(unitPayment, {
          contractorName: String(input.contractorName || unitPayment.contractorName).trim(),
          bankName: String(input.bankName || "").trim(),
          accountNumber: String(input.accountNumber || "").trim(),
          bankManagerName: String(input.bankManagerName || "").trim(),
          bankManagerPhone: String(input.bankManagerPhone || "").trim(),
          totalPrice: Math.max(Number(input.totalPrice || 0), 1),
        });
        record(data, `Updated payment settings ${unitId}`);
        return hydratePaymentRows(unitPayment);
      });
    },
    updatePaymentStage(unitId, stepId, input) {
      return withData((data) => {
        const unitPayment = data.paymentDataByUnit[unitId];
        const rowItem = unitPayment && unitPayment.paymentSchedule.find((item) => item.stepId === Number(stepId));
        if (!rowItem) throw new Error("납부 차수를 찾을 수 없습니다.");
        const status = ["납입 예정", "일부 납입", "납입 완료", "미납"].includes(input.status) ? input.status : rowItem.status;
        Object.assign(rowItem, {
          title: String(input.title || rowItem.title).trim(),
          dueDate: String(input.dueDate || "").trim(),
          requiredAmount: Math.max(Number(input.requiredAmount || 0), 0),
          paidAmount: Math.max(Number(input.paidAmount || 0), 0),
          status,
          memo: String(input.memo || "").trim(),
        });
        rowItem.unpaidAmount = Math.max(rowItem.requiredAmount - rowItem.paidAmount, 0);
        record(data, `Updated payment stage ${unitId} ${rowItem.title}`);
        return rowItem;
      });
    },
    calculatePaymentSummary(paymentData) {
      return paymentSummary(paymentData);
    },
  };

  const documentService = {
    listDocuments(unitId, options = {}) {
      const list = readData().documentsByUnit[unitId] || [];
      const filtered = options.visibleOnly ? list.filter((item) => item.isVisibleToUser) : list;
      return clone(filtered.sort((a, b) => String(b.uploadedAt).localeCompare(String(a.uploadedAt))));
    },
    createDocument(unitId, input) {
      return withData((data) => {
        const list = data.documentsByUnit[unitId] || [];
        const item = normalizeDocument(input, `doc-${Date.now()}`);
        if (!item.title) throw new Error("문서 제목은 필수입니다.");
        list.unshift(item);
        data.documentsByUnit[unitId] = list;
        record(data, `Created document ${unitId} ${item.title}`);
        return item;
      });
    },
    updateDocument(unitId, documentId, input) {
      return withData((data) => {
        const list = data.documentsByUnit[unitId] || [];
        const item = list.find((docItem) => docItem.documentId === documentId);
        if (!item) throw new Error("문서를 찾을 수 없습니다.");
        Object.assign(item, normalizeDocument({ ...item, ...input }, documentId));
        if (!item.title) throw new Error("문서 제목은 필수입니다.");
        record(data, `Updated document ${unitId} ${item.title}`);
        return item;
      });
    },
    deleteDocument(unitId, documentId) {
      return withData((data) => {
        data.documentsByUnit[unitId] = (data.documentsByUnit[unitId] || []).filter((item) => item.documentId !== documentId);
        record(data, `Deleted document ${unitId} ${documentId}`);
        return true;
      });
    },
  };

  function normalizeDocument(input, documentId) {
    return {
      documentId,
      title: String(input.title || "").trim(),
      type: String(input.type || "기타").trim(),
      fileName: String(input.fileName || "metadata-only-demo.pdf").trim(),
      description: String(input.description || "").trim(),
      uploadedAt: String(input.uploadedAt || new Date().toISOString().slice(0, 10)).trim(),
      isVisibleToUser: Boolean(input.isVisibleToUser),
    };
  }

  const adminService = {
    getDashboardSummary() {
      const data = readData();
      const payments = Object.values(data.paymentDataByUnit).map(hydratePaymentRows);
      const today = new Date().toISOString().slice(0, 10);
      const documents = Object.values(data.documentsByUnit).flat().sort((a, b) => String(b.uploadedAt).localeCompare(String(a.uploadedAt))).slice(0, 3);
      return clone({
        totalUnits: data.units.length,
        completedUnits: data.units.filter((unit) => unit.contractStatus === "계약 완료").length,
        unpaidUnits: payments.filter((item) => item.paymentSchedule.some((rowItem) => rowItem.unpaidAmount > 0 || rowItem.status === "미납")).length,
        todayDueCount: payments.flatMap((item) => item.paymentSchedule).filter((rowItem) => rowItem.dueDate === today).length,
        recentDocuments: documents,
        recentActivity: data.activity.slice(0, 5),
      });
    },
    recordActivity(message) {
      return withData((data) => {
        record(data, String(message || "Admin activity"));
        return data.activity[0];
      });
    },
    listRecentActivity() {
      return clone(readData().activity.slice(0, 5));
    },
  };

  function resetDemoData() {
    const data = seedData();
    saveData(data);
    localStorage.removeItem(SESSION_KEY);
    return clone(data);
  }

  readData();
  Object.assign(window, {
    timorStorageNamespace: STORAGE_NAMESPACE,
    timorDemoErrors: { CONTRACTOR_LOGIN_ERROR, ADMIN_LOGIN_ERROR },
    resetDemoData,
    authService,
    unitService,
    journeyService,
    paymentService,
    documentService,
    adminService,
  });
})();

