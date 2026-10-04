import { Outlet, useParams } from "react-router-dom";
import { SessionsSidebar, type Tab } from "../components/SessionsSidebar";

// Estructura común de Teach y Learn: barra de sesiones a la izquierda y contenido a la derecha.
export function TabLayout({ tab }: { tab: Tab }) {
  const { id } = useParams();
  return (
    <>
      <SessionsSidebar tab={tab} activeId={id ?? null} />
      <div className="lg:pl-[300px]">
        <div className="px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
          <Outlet />
        </div>
      </div>
    </>
  );
}
