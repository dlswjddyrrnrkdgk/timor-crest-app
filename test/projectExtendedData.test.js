import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const migrationSource = readFileSync(new URL("../supabase/migrations/0011_project_extended_data.sql", import.meta.url), "utf8");
const documentServiceSource = readFileSync(new URL("../src/services/documentService.js", import.meta.url), "utf8");
const journeyServiceSource = readFileSync(new URL("../src/services/journeyService.js", import.meta.url), "utf8");
const customerServiceSource = readFileSync(new URL("../src/services/adminCustomerManagementService.js", import.meta.url), "utf8");
const customerPageSource = readFileSync(new URL("../src/components/admin/CustomerManagementPage.jsx", import.meta.url), "utf8");
const adminLayoutSource = readFileSync(new URL("../src/routes/AdminLayout.jsx", import.meta.url), "utf8");
const contractorLayoutSource = readFileSync(new URL("../src/routes/ContractorLayout.jsx", import.meta.url), "utf8");
const translationsSource = readFileSync(new URL("../src/i18n/translations.js", import.meta.url), "utf8");

describe("Project extended data foundation", () => {
  it("adds project scope to every phase-3 table without touching payment items", () => {
    for (const table of [
      "document_files",
      "journey_template_steps",
      "sales_leads",
      "consultation_notes",
      "crm_events",
      "search_performance_snapshots",
    ]) {
      assert.match(migrationSource, new RegExp(`alter table public\\.${table}[\\s\\S]+add column if not exists project_id`));
      assert.match(migrationSource, new RegExp(`${table}_project_id_idx`));
    }
    assert.doesNotMatch(migrationSource, /payment_items[\s\S]+project_id/);
    assert.match(migrationSource, /alter column project_id set not null/);
    assert.match(migrationSource, /where project_id is null/);
  });

  it("seeds Ocean with a clean project-specific eight-step Journey", () => {
    assert.match(migrationSource, /journey_template_steps_project_step_no_key/);
    assert.match(migrationSource, /project_id,\s*step_no/);
    assert.match(migrationSource, /'timor-crest-ocean'/);
    assert.match(migrationSource, /'pending',\s*0,\s*null,\s*null,\s*null/);
    assert.match(migrationSource, /not exists \([\s\S]+existing\.project_id[\s\S]+existing\.step_no = source\.step_no/);
    assert.match(migrationSource, /drop constraint if exists journey_template_steps_step_no_key/);
  });

  it("threads selected project IDs through Documents, Journey, and Customer Management", () => {
    assert.match(documentServiceSource, /\.eq\("project_id", projectId\)/);
    assert.match(documentServiceSource, /project_id: projectId/);
    assert.match(journeyServiceSource, /\.eq\("project_id", projectId\)/);
    assert.match(journeyServiceSource, /project_id: projectId/);
    assert.match(journeyServiceSource, /onConflict: "project_id,step_no"/);
    assert.match(customerServiceSource, /\.eq\("project_id", projectId\)/);
    assert.match(customerServiceSource, /project_id: projectId/);
    assert.match(customerPageSource, /useProject/);
    assert.match(customerPageSource, /loadCustomerManagementDashboard\(selectedProjectId\)/);
    assert.match(customerPageSource, /createSalesLead\(form, selectedProjectId\)/);
    assert.match(customerPageSource, /createConsultationNote\(form, selectedProjectId\)/);
  });

  it("refreshes Admin and Contractor Journey data using the owning project", () => {
    assert.match(adminLayoutSource, /getJourneySteps\(selectedProjectId\)/);
    assert.match(adminLayoutSource, /ensureDefaultJourneySteps\(selectedProjectId\)/);
    assert.match(adminLayoutSource, /updateJourneyStep\(change\.id, change\.values, selectedProjectId\)/);
    assert.match(adminLayoutSource, /getAdminDocuments\(selectedProjectId\)/);
    assert.match(adminLayoutSource, /listCrmEvents\(selectedProjectId\)/);
    assert.match(contractorLayoutSource, /getJourneySteps\(contractResult\.data\?\.project_id\)/);
    assert.match(contractorLayoutSource, /getMyDocumentSummary\(contractResult\.data\?\.project_id\)/);
  });

  it("contains the project-specific empty-state guidance", () => {
    assert.match(translationsSource, /Showing project-specific data\./);
    assert.match(translationsSource, /프로젝트별 데이터를 표시 중입니다\./);
    assert.match(translationsSource, /This project has no search performance data yet\./);
    assert.match(translationsSource, /이 프로젝트에는 아직 검색 성과 데이터가 없습니다\./);
  });
});
