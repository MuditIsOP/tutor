import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

function AppShell({
  student,
  title,
  subtitle,
  children,
  mainClassName = "",
  contentClassName = "",
}) {
  return (
    <main className={`min-h-screen px-4 py-4 sm:px-6 sm:py-6 ${mainClassName}`.trim()}>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:items-start lg:flex-row">
        <Sidebar />
        <section className={`min-w-0 flex-1 space-y-6 ${contentClassName}`.trim()}>
          <Navbar student={student} title={title} subtitle={subtitle} />
          {children}
        </section>
      </div>
    </main>
  );
}

export default AppShell;
