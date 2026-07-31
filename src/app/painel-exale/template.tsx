import AdminProductRemoveFix from "@/components/admin-product-remove-fix";
import AdminProductsPanelReal from "@/components/admin-products-panel-real";
import AdminFormatSyncBridge from "@/components/admin-format-sync-bridge";

export default function PainelExaleTemplate({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AdminFormatSyncBridge />
      <AdminProductRemoveFix />
      <AdminProductsPanelReal />
    </>
  );
}
