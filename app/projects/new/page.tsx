import { createProjectAction } from "@/lib/actions";
import { PROJECT_COLORS, PROJECT_TEMPLATES, PROJECT_TYPE_OPTIONS } from "@/lib/templates";
import { redirect } from "next/navigation";

export default function NewProjectPage() {
  async function submit(formData: FormData) {
    "use server";
    const id = await createProjectAction(formData);
    if (id) redirect(`/projects/${id}`);
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold text-neutral-50">New Project</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Pick a project type and we&apos;ll pre-fill the stages for you. You can add or rename
        stages any time from the project page.
      </p>

      <form action={submit} className="mt-6 flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-400">Project name</label>
          <input
            name="name"
            required
            placeholder="e.g. One Stop Tyres"
            className="w-full rounded-lg border border-base-600 bg-base-850 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-400">Client</label>
          <input
            name="client"
            placeholder="e.g. One Stop Tyres Ltd"
            className="w-full rounded-lg border border-base-600 bg-base-850 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-400">Project type</label>
          <div className="grid grid-cols-2 gap-2">
            {PROJECT_TYPE_OPTIONS.map((opt, i) => (
              <label
                key={opt.value}
                className="flex cursor-pointer flex-col gap-1 rounded-lg border border-base-600 bg-base-850 p-3 text-sm has-[:checked]:border-accent-500 has-[:checked]:bg-accent-500/10"
              >
                <span className="flex items-center gap-2">
                  <input type="radio" name="type" value={opt.value} defaultChecked={i === 0} className="accent-accent-500" />
                  <span className="font-medium text-neutral-100">{opt.label}</span>
                </span>
                <span className="text-xs text-neutral-500">
                  {PROJECT_TEMPLATES[opt.value].stages.length} stages
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-400">Description</label>
          <textarea
            name="description"
            rows={3}
            placeholder="What are you delivering for this client?"
            className="w-full rounded-lg border border-base-600 bg-base-850 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-accent-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-400">Color</label>
          <div className="flex gap-2">
            {PROJECT_COLORS.map((color, i) => (
              <label key={color} className="cursor-pointer">
                <input type="radio" name="color" value={color} defaultChecked={i === 0} className="peer sr-only" />
                <span
                  className="block h-7 w-7 rounded-full ring-offset-2 ring-offset-base-950 peer-checked:ring-2"
                  style={{ backgroundColor: color, ["--tw-ring-color" as string]: color }}
                />
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="mt-2 rounded-lg bg-accent-500 py-2.5 text-sm font-semibold text-base-950 hover:bg-accent-400 shadow-glow"
        >
          Create Project
        </button>
      </form>
    </div>
  );
}
