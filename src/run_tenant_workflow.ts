import { clientFromEnvironment } from "./infrai_client.ts";
import { provisionTenant } from "./tenant_key_workflow.ts";

const result = await provisionTenant(clientFromEnvironment(), {
  tenantId: "clinic-north",
  operatorEmail: "chenhua@changba.com",
  operatorName: "Clinic North Scheduling"
});

console.log(JSON.stringify(result, null, 2));
console.log("Store the returned key now; its plaintext cannot be retrieved again.");
