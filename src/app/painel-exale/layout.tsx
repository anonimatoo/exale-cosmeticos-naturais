import AdminProductsPanelReal from "@/components/admin-products-panel-real";
import AdminProductRemoveFix from "@/components/admin-product-remove-fix";
import AdminProfessionalEnhancer from "@/components/admin-professional-enhancer";
import AdminFormatSyncBridge from "@/components/admin-format-sync-bridge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function PainelExaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <AdminProductRemoveFix />
      <AdminProductsPanelReal />
      <AdminProfessionalEnhancer />
      <AdminFormatSyncBridge />
    </>
  );
}
