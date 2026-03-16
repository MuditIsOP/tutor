import Navbar from "./Navbar";
import AdminSidebar from "./AdminSidebar";

function AdminShell({ admin, title, subtitle, children }) {
  return (
    <main className="min-h-screen px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:items-start lg:flex-row">
        <AdminSidebar />
        <section className="min-w-0 flex-1 space-y-6">
          <Navbar
            student={{ name: admin?.username || "Admin", student_id: "Administrator" }}
            title={title}
            subtitle={subtitle}
          />
          {children}
        </section>
      </div>
    </main>
  );
}

export default AdminShell;
