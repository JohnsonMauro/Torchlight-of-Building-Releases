import { HelpButton } from "../ui/HelpButton";

// The open build under the header, beside the view rail: its name on a gilded tab (right-click or the rename key
// renames it, src/app/builds/build-library-controller.js) and whether it is saved. src/app/planner/page.js
// updateStorageStatus fills the tab's <span> and <strong> and the status's first <span>, and marks the status
// "storage-warning" or "no-build"; renaming marks the tab "renaming" and puts a .loadout-tab-rename input in it. Phones
// drop Manage Loadouts (the header's Builds action opens the same view) to leave the build name room.
export function LoadoutStrip() {
  return (
    <div
      className="relative z-10 ml-16 flex min-h-[54px] items-stretch bg-[linear-gradient(90deg,rgb(19_23_31/0.98),rgb(12_16_22/0.96))] px-[18px] shadow-[0_8px_24px_rgb(0_0_0/0.3)] backdrop-blur-[15px] max-sm:px-2"
      aria-label="Active loadout"
    >
      <div
        className="loadout-tab group/tab relative min-w-[275px] cursor-context-menu border border-t-[#e8b660] border-r-[#79572f] border-b-[#79572f] border-l-2 border-l-[#e6a449] bg-[linear-gradient(105deg,rgb(246_193_84/0.16),rgb(206_139_50/0.08)_43%,transparent_82%),linear-gradient(180deg,#252a2c,#151c25)] px-3.5 py-2 shadow-[inset_0_1px_rgb(255_231_165/0.16),0_3px_12px_rgb(0_0_0/0.2)] [clip-path:polygon(0_0,calc(100%-13px)_0,100%_13px,100%_100%,0_100%)] focus-visible:outline-none max-sm:min-w-0 max-sm:flex-[0_1_275px] [&_.loadout-tab-rename]:block [&_.loadout-tab-rename]:w-full [&_.loadout-tab-rename]:max-w-[245px] [&_.loadout-tab-rename]:border-0 [&_.loadout-tab-rename]:border-b [&_.loadout-tab-rename]:border-[#79572f] [&_.loadout-tab-rename]:bg-transparent [&_.loadout-tab-rename]:p-0 [&_.loadout-tab-rename]:font-display [&_.loadout-tab-rename]:text-[0.87rem] [&_.loadout-tab-rename]:font-black [&_.loadout-tab-rename]:tracking-[0.07em] [&_.loadout-tab-rename]:text-gold [&_.loadout-tab-rename]:uppercase [&_.loadout-tab-rename]:caret-gold [&_.loadout-tab-rename]:outline-none [&_.loadout-tab-rename:focus]:border-[#e8b660]"
        tabIndex={0}
        title="Right-click to rename"
      >
        <span className="block text-[0.6rem] font-bold tracking-[0.15em] text-[#e8b66d] uppercase">Active build</span>
        <strong className="text-gilded mt-0.5 block max-w-[245px] truncate font-display text-[0.87rem] font-black tracking-[0.07em] uppercase group-[.renaming]/tab:hidden">
          Loading build…
        </strong>
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0.5 h-px bg-[linear-gradient(90deg,#ffe4a0,#e8ad4f_36%,transparent_95%)]"
        />
      </div>
      <HelpButton topic="builds" label="Builds" className="self-center" />
      <div className="loadout-status group/status ml-auto flex items-center gap-2 px-6 text-[0.67rem] text-[#8f98a5] max-md:px-2 [&.storage-warning]:text-[#ffbd75]">
        <i className="size-1.5 shrink-0 rounded-full bg-ok shadow-[0_0_8px_var(--color-ok)] group-[.no-build]/status:bg-[#87909e] group-[.no-build]/status:shadow-none group-[.storage-warning]/status:bg-[#ff8a38] group-[.storage-warning]/status:shadow-[0_0_8px_#ff8a38]" />
        <span className="max-md:hidden">Autosaved locally</span>
        <button
          type="button"
          className="btn-bronze ml-3 px-2.5 py-1.75 text-[0.67rem] whitespace-nowrap max-md:ml-1 max-sm:hidden"
          data-view="builds"
        >
          Manage Loadouts
        </button>
        <button
          type="button"
          className="btn-bronze ml-3 px-2.5 py-1.75 text-[0.67rem] whitespace-nowrap max-md:ml-1 max-sm:px-1.5"
          data-report-bug=""
          title="Open a GitHub form to report a planner bug"
        >
          Report bug
        </button>
      </div>
      <span
        aria-hidden="true"
        className="absolute inset-x-0 -bottom-px h-px bg-[linear-gradient(90deg,#f9ca65_0%,#e8ad4f_38%,#9a6d37_75%,#59452f_100%)]"
      />
    </div>
  );
}
