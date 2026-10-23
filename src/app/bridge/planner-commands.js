// Commands the planner carries out for the React UI (apps/web) while it owns the open build's state: anything that
// loads a different build, changes the library or edits the open build goes through here, so the planner can save the
// open build, recalculate and re-render its own views (React views re-read their src/app/bridge/view-sources.ts
// source). Each section's controller (src/app/<section>/*) defines its commands; src/app/app.js provides them all when
// it loads.

/**
 * @typedef {object} PlannerCommands
 * @property {(id: string) => void} editBuild Opens a saved build on the page a build was last left on (Hero Trait at first).
 * @property {() => void} newBuild Creates an empty build, opens it in the Build view.
 * @property {() => void} duplicateActiveBuild Saves the open build, then opens a copy of it.
 * @property {(details: { name: string, notes: string }) => void} saveBuildDetails Renames the open build and sets its notes.
 * @property {(id: string) => void} deleteBuild Deletes a saved build (already confirmed by the user).
 * @property {() => void} deleteAllBuilds Deletes every saved build (already confirmed by the user).
 * @property {() => void} backupBuilds Downloads every saved build as a JSON backup.
 * @property {(text: string) => void} restoreBackup Restores the builds in a backup file's text (a toast says what was
 *   restored, or why nothing was).
 * @property {() => void} resetBuild Empties the open build (already confirmed by the user).
 * @property {() => Promise<void>} exportBuild Copies the open build's code to the clipboard (a toast says how it went).
 * @property {(text: string) => void} importBuild Adds a pasted build code as a new active build and opens the Builds view;
 *   a toast says when the code cannot be read (the Import dialog then stays open).
 * @property {(text: string) => void} renameBuild Build strip: renames the open build (a blank or unchanged name keeps
 *   the old one).
 * @property {() => void} reloadOtherTabBuild Other-tab notice: opens the version another tab saved.
 * @property {() => void} dismissSeasonChange Build strip: drops the list of what moving the open build into the current
 *   season removed.
 * @property {() => void} dismissOtherTabChange Other-tab notice: keeps this tab's version (the notice comes back only
 *   when that build changes again).
 * @property {() => void} startNewLibrary Unreadable-library notice: starts a new library (the unreadable data stays
 *   backed up; a toast says when there is no room for that copy).
 * @property {() => void} undoLastChange Calculation-failure notice: the build's latest saved revision replaces it.
 * @property {() => void} openSafeMode Calculation-failure notice: reloads without calculations.
 * @property {() => void} resumeCalculations Safe-mode notice: reloads with calculations.
 * @property {(id: string) => void} placeCraftedSlate Slate Inventory, right-click: places the slate on the grid (or
 *   beside a full grid).
 * @property {() => void} startSlateCraft Slate Inventory: Craft Slate (the crafter on a new slate).
 * @property {(id: string) => void} duplicateCraftedSlate Slate Inventory: adds a copy of a slate, off the grid.
 * @property {(id: string) => void} editCraftedSlate Slate Inventory: opens the crafter on a slate.
 * @property {(id: string) => void} removeCraftedSlate Slate Inventory: takes a slate off the grid.
 * @property {(id: string) => void} deleteCraftedSlate Slate Inventory: deletes a slate.
 * @property {(change: import("../slates/slate-craft.ts").SlateCraftChange) => void} changeSlateCrafter Slate crafter: a
 *   control's change (a tab, god, Nether King type or template draws the form anew).
 * @property {(select: HTMLSelectElement, index: number) => void} registerSlateAffixSelect Slate crafter: an affix select,
 *   so the planner's searchable list shows its choices and a pick sets its slot.
 * @property {() => void} addCraftedSlate Slate crafter: Add to Inventory, or Save Changes on the edited slate.
 * @property {() => void} backToSlateInventory Slate crafter: Back to Inventory or Cancel.
 * @property {(name: string) => void} selectKismetChoice Kismet crafter: chooses a Kismet (at its best values).
 * @property {(index: number, value: number) => void} setKismetRoll Kismet crafter: a value as typed or slid (kept only
 *   while in range).
 * @property {(index: number, text: string) => void} commitKismetRoll Kismet crafter: a typed value committed (snapped
 *   to its step and range).
 * @property {() => void} confirmKismet Kismet crafter: installs the chosen Kismet in the slot (a toast when the kind's
 *   slots are full) and closes.
 * @property {() => void} clearKismetCrafterSlot Kismet crafter: empties the slot and closes.
 * @property {() => void} closeKismetCrafter Kismet crafter was closed: forgets the slot it was open for.
 * @property {(type: "ethereal" | "inverse") => void} setPrismType Prism crafter: a new draft of that type, back to its
 *   bases.
 * @property {(base: string) => void} pickPrismBase Prism crafter: a base card picked opens its form (keeping only the
 *   affixes it can roll).
 * @property {() => void} repickPrism Prism crafter: the form's path back to the type's bases.
 * @property {(kind: string, value: string) => void} setPrismAffix Prism crafter: a random affix (radius, rare,
 *   legendary) or a Haze's base affix (base).
 * @property {(kind: string, value: number) => void} setInverseRoll Prism crafter: an Inverse Image's mod value
 *   (rounded, in range).
 * @property {() => void} cancelPrismCraft Prism crafter: Cancel or close, back to the prism inventory.
 * @property {() => void} confirmPrismCraft Prism crafter: Craft or Save Changes, back to the prism inventory.
 * @property {() => void} toggleSelectedItemEquip Inventory item dialog: equips the open item, or unequips it; closes.
 * @property {() => void} copySelectedItem Inventory item dialog: duplicates the open item; closes.
 * @property {() => void} deleteSelectedItem Inventory item dialog: deletes the open item (emptying its slot); closes.
 * @property {() => void} saveInventoryItemEdit Item editor: saves its fields to the item and comes back to the item.
 * @property {(change: import("./inventory-item-editor-view.ts").InventoryItemEditorChange) => void}
 *   changeInventoryItemEditor Item editor: a field typed or a line's control changed.
 * @property {(id: string) => void} toggleCraftedMemory Hero memories: equips a memory into its type's socket, or
 *   unequips it.
 * @property {(id: string) => void} toggleBaseMemory Hero memories, base trait slot: equips a fitting memory there (at its
 *   best roll), or unequips it.
 * @property {() => void} clearBaseMemory Hero memories: empties the base trait slot.
 * @property {() => void} clearHeroMemorySlot Hero memories: empties the socket the dialog was opened for.
 * @property {(id: string) => void} memoryContextMenu Hero memories, right-click: unequips the memory, or equips it into an
 *   open compatible slot (a toast says when there is none).
 * @property {(id: string) => void} copyCraftedMemory Hero memories: adds a copy of a memory.
 * @property {(id: string) => void} editCraftedMemory Hero memories: opens the crafter on a memory.
 * @property {(id: string) => void} deleteCraftedMemory Hero memories: deletes a memory (emptying its socket).
 * @property {() => void} startMemoryCraft Hero memories: opens the crafter on a new memory of the socket's type.
 * @property {() => void} cancelMemoryCraft Memory crafter: drops the draft and comes back to the inventory.
 * @property {() => void} saveMemoryCraft Memory crafter: saves the draft (Craft / Save Changes) and comes back.
 * @property {(field: string, value: string | number | boolean) => void} setMemoryField Memory crafter: a control's value
 *   (baseStat, enhancementLevel, waxAndWane, risingMoon, revivedAffix, revivedRoll, fixedAffixes.N, randomAffixes.N,
 *   fixedRolls.N, randomRolls.N).
 * @property {(type: string) => void} setMemoryType Memory crafter: the memory type (clears the base stat).
 * @property {(rarity: string) => void} setMemoryRarity Memory crafter: the rarity (caps the enhancement level).
 * @property {(tier: number) => void} setRevivedTier Memory crafter: the revived affix's tier (its best roll).
 * @property {(group: string, index: number, tier: number) => void} setMemoryAffixTier Memory crafter: an affix line's
 *   tier (its best roll).
 * @property {(group: string, index: number, position: number) => void} setMemoryTierPosition Memory crafter: the tier
 *   slider of a line whose tiers differ by a number only.
 * @property {(group: string, index: number, text: string) => void} setMemoryTierValue Memory crafter: that line's typed
 *   value (the closest tier).
 * @property {() => void} openGameLogImport Opens Import from game and looks for the game log through the local reader.
 * @property {(file: File | null) => void} chooseGameLogFile Import from game: reads a chosen log in the page and lists
 *   its logins (none chosen), or says why it cannot.
 * @property {() => void} showGameLogPicker Import from game: "Choose a different file…" (shows the file picker).
 * @property {(id: string) => void} selectGameLogSnapshot Import from game: turns a login into a build and shows its
 *   summary.
 * @property {() => void} importGameLogBuild Import from game: adds the chosen login's build as a new active build, closes
 *   the dialog and opens the Builds view.
 * @property {() => void} closeGameLogImport Import from game was closed: drops the log, its logins and any read under
 *   way.
 * @property {(auto: boolean) => void} setBestCaseMode Config tab: Best case (automatic conditions) on, or manual.
 * @property {(id: string, on: boolean) => void} setCombatCondition Switches a combat condition (or own buffs built before
 *   the fight, `prebuiltSelfBuffs`).
 * @property {(toggle: string, on: boolean) => void} setBestCaseAssumption Switches a best-case assumption.
 * @property {() => void} resetBestCaseAssumptions Turns every best-case assumption back on.
 * @property {(group: string, index: number) => void} pinExclusiveChoice Pins an option of an exclusive choice group (the
 *   best option clears the pin).
 * @property {(auto: boolean) => void} setAimUptimeAuto Aim uptime derived from the build, or manual.
 * @property {(key: string, value: string) => void} setCombatValue Sets an Advanced number as typed (combat[key]).
 * @property {(slot: number) => void} openPactspiritSelector Opens the Pactspirit selector for pact slot 0–2.
 * @property {(name: string) => void} selectPactspirit Pactspirit selector: puts that Pactspirit in the slot it was opened for
 *   (swapping when it sits in another slot).
 * @property {(slot: number) => void} removePactspirit Empties pact slot 0–2.
 * @property {(name: string, level: number) => void} setPactspiritLevel Sets a Pactspirit's level (1–6).
 * @property {(name: string, nodeIndex: number) => void} togglePactNode Kismet slot mode: allocates or refunds a node
 *   (with the nodes it needs or that need it).
 * @property {(key: string, kind: "micro" | "medium") => void} openKismetCrafter Opens the Kismet crafter for a slot.
 * @property {(key: string) => void} clearKismetSlot Removes the Kismet in a slot.
 * @property {(name: string) => void} openFateSlotSelector Opens the extra Fate slot choices of a Pactspirit.
 * @property {(name: string) => void} clearFateSlots Removes a Pactspirit's extra Fate slots (and their Kismets).
 * @property {(id: string) => void} selectFateSlots Fate slot selector: unlocks those extra slots on the Pactspirit it is open
 *   for (Kismets in slots it no longer has are dropped).
 * @property {(from: string, to: string, kind: "micro" | "medium", copy: boolean) => void} moveKismet Moves (or copies)
 *   a Kismet to another slot of the same kind, or swaps the two.
 * @property {(text: string) => void} showToast Shows a short message (plain text).
 * @property {() => void} openFollowerSelector Opens the follower selector.
 * @property {(followerId: string, rarityId: string) => void} selectFollower Follower selector: makes that follower at that
 *   rarity the open build's.
 * @property {(slot: number) => void} openFollowerSkillSelector Opens the skill picker for a follower skill slot.
 * @property {(slot: number) => void} clearFollowerSkill Empties a follower skill slot.
 * @property {(tab: "skills" | "auras") => void} setSkillBoardTab Shows the Skills or the Auras board.
 * @property {(row: number, supportSlot: number | null) => void} openSkillSelector Opens the skill selector for a row of
 *   the open board (supportSlot null), or the support selector for one of its sockets (0–4).
 * @property {(index: number) => void} chooseSkillSelectorEntry Skill selector: highlights a choice of its list (with its
 *   saved level and configuration when it is the slot's).
 * @property {() => void} confirmSkillSelector Skill selector Confirm: installs the highlighted choice in the slot it was
 *   opened for, at the selector's level (the follower picker: the skill with its draft tier and affixes).
 * @property {(value: string) => void} setSelectorLevel Skill selector: the skill or support level (1–40; 20 when not a
 *   number).
 * @property {(tier: number) => void} setSpecialTier A star support's main affix tier (its roll goes to the tier's maximum).
 * @property {(value: string) => void} setSpecialRoll A star support's main affix roll (kept within the tier).
 * @property {(stars: number) => void} setSupportStars A support's star level (1–5).
 * @property {(tier: number) => void} setProgressionTier A progression support's tier (every roll to its maximum; for an
 *   Activation Medium, every line).
 * @property {(index: number, value: string) => void} setProgressionRoll One roll of a progression support (kept in range).
 * @property {(index: number, tier: number | "off") => void} setAffixLineTier An Activation Medium line's tier, or Off.
 * @property {(index: number, rollIndex: number, value: string) => void} setAffixRoll One roll of an Activation Medium line.
 * @property {(from: number, to: number) => void} setAffixChoice The stat an Activation Medium line with a choice rolls
 *   (moves its tier and rolls to that line).
 * @property {(row: number) => boolean} removeSkill Takes the user's skill off a row; false when the row holds none.
 * @property {(row: number, slot: number) => boolean} removeSupport Takes the user's support out of a socket; false when
 *   the socket holds none.
 * @property {(tab: "skills" | "auras", from: number, to: number) => void} moveSkill Moves a skill to another row of its
 *   board tab, swapping with the skill there.
 * @property {(move: SupportMove) => void} moveSupport Moves (or copies) a support to another socket of the same board tab,
 *   swapping with the support there.
 * @property {() => void} resetSkills Empties both board tabs.
 * @property {(id: string, toolsPosition: { x: number, y: number }) => void} selectSlate Selects a slate on the Divinity Slates
 *   board; its tools open at `toolsPosition` (stage pixels).
 * @property {() => void} clearSlateSelection A click away from the slates and their tools.
 * @property {(id: string) => void} startSlateMove Move mode: the next board cell click places the slate.
 * @property {(column: number, row: number) => void} placeSlateAtCell Move mode: places the slate with its top-left there.
 * @property {(id: string, change: { rotate: 1 | -1 } | { flip: "x" | "y" }) => void} transformSlate Rotates or flips a
 *   slate; one that no longer fits waits under the pointer until a click (finishPendingSlate).
 * @property {(down: boolean) => void} wheelTransformSlate The wheel over the board with a slate selected.
 * @property {(id: string) => void} removeSlate Takes an equipped or parked slate off the board.
 * @property {(id: string) => boolean} rightClickRemoveSlate Right-click: takes an equipped or parked slate off the board
 *   ("Slate removed"); false for any other slate.
 * @property {(id: string, drop: SlateDrop) => void} dropSlate The end of a drag (measured by the board).
 * @property {() => void} slateDragCancelled A drag the browser cancelled: the slate goes back.
 * @property {(drop: SlateDrop) => void} finishPendingSlate The click that ends a waiting slate.
 * @property {(id: string) => void} editSlate Opens a slate's affix editor (a crafted slate's, in the inventory).
 * @property {() => void} openSlateInventory Opens the slate inventory.
 * @property {(slot: string) => void} openEquipmentSlot Gear: a click on a slot. An equipped slot opens its item's dialog;
 *   an empty one becomes the selected slot (where the next ring or weapon goes).
 * @property {(slot: string) => boolean} unequipEquipmentSlot Right-click: unequips a slot; false when it is already
 *   empty.
 * @property {(id: string) => void} equipInventoryItem Equips an Inventory item in the slot it fits (the selected slot
 *   for a ring or a weapon).
 * @property {(id: string) => void} openInventoryItem Opens an Inventory item's dialog (Equip, Edit, Copy, Delete).
 * @property {(id: string) => void} editInventoryItem Opens an Inventory item's editor.
 * @property {(id: string) => void} duplicateInventoryItem Adds a copy of an Inventory item ("<name> Copy").
 * @property {() => void} resetEquipment Unequips every slot (the Inventory stays).
 * @property {() => void} sortInventory Sorts the Inventory in the game's bag order (src/app/gear/inventory-sort.ts).
 * @property {(mode?: "rare" | "legendary" | "vorax") => void} openEquipmentCrafter Opens the crafter on its first step
 *   (the kind of item), or in that mode.
 * @property {(change: import("../gear/equipment-craft.ts").CraftChange) => void} changeEquipmentCraft Equipment
 *   crafter: a control's change to the draft (a toast when it is refused).
 * @property {() => void} addCraftedEquipment Equipment crafter: Add to Inventory, or Save Changes on the edited item;
 *   closes.
 * @property {() => void} closeEquipmentCrafter Equipment crafter was closed: the edited item is let go.
 * @property {(drop: GearDrop) => void} dropGear The end of a gear drag on a slot the item fits, or on the Inventory.
 * @property {(slot: number) => void} openTalentTree Opens the tree in a tab (0–3), or the tree picker for an empty one.
 * @property {(slot: number) => boolean} removeTalentTree Right-click on a tab: empties it and every tab after it; false
 *   when it is empty.
 * @property {() => void} openTalentSlates Shows the slate board in place of the tree.
 * @property {(threshold: number) => void} openCorePicker Opens the core talent picker for a core slot of the open tree.
 * @property {(name: string) => void} selectCoreTalent Core talent picker: the open tree's slot takes that core talent.
 * @property {(threshold: number) => boolean} removeCoreTalent Right-click: empties a core slot; false when it is empty.
 * @property {(coordinate: string) => void} clickTalentNode A click on a node ("column,row") of the open tree: places a
 *   waiting prism, opens the prism inventory on the installed prism, or adds a point.
 * @property {(coordinate: string) => void} rightClickTalentNode A right-click on a node: takes the installed prism off,
 *   takes a point off, or fills an empty node.
 * @property {() => void} resetTalentTree Empties the open tree's points and cores.
 * @property {() => void} reselectTalentTree Opens the tree picker for the open tree's tab.
 * @property {(name: string) => void} selectTalentTree Tree picker: the open slot takes that tree.
 * @property {() => void} openPrismInventory Opens the prism inventory for the open tree (not the God tree).
 * @property {() => void} openPrismCrafter Prism inventory: opens the prism crafter for a new prism.
 * @property {(id: string) => void} editCraftedPrism Prism inventory: opens the crafter on a crafted prism.
 * @property {(id: string) => void} installCraftedPrism Prism inventory: the next talent node clicked takes that prism.
 * @property {(id: string) => void} deleteCraftedPrism Prism inventory: deletes a prism (taking it off its trees).
 * @property {() => void} unequipPrism Prism inventory: takes the prism off the tree it is open for.
 * @property {() => void} cancelPrismPlacement Drops the prism waiting for its node.
 * @property {(coordinate: string | null) => void} dropPrism The end of a drag of the installed prism: on a node
 *   ("column,row"), or null away from the nodes.
 * @property {(value: string) => void} setCharacterLevel The character level as typed (1–100; empty stores none).
 * @property {(tab: "traits" | "path" | "scent") => void} setHeroDetailTab HERO tab: Hero Trait, Trait Path or Scent Bottle.
 * @property {() => void} openHeroSelector Opens the hero selector.
 * @property {(id: string) => void} selectHero Hero selector: switches the open build to that hero (its own loadout).
 * @property {(tier: string) => void} openMemorySocket Opens the memory selector for a socket ("base", "level45",
 *   "<hero>:level45" …).
 * @property {(tier: string) => boolean} removeMemory Right-click: takes a socket's memory off; false when it holds none.
 * @property {(selectionKey: string, name: string) => void} pickHeroTrait Picks a trait for a level (or Bing's upper /
 *   lower choice), or unselects it when picked.
 * @property {(name: string) => void} toggleTraitPathNode Trait Path: picks a trait, or takes the path back from it.
 * @property {(from: number, to: number | null) => void} moveTraitPick The end of a drag of a tree hero's pick: onto
 *   another row (0–3), or null off the rows.
 * @property {(kind: string) => void} openScentSlot Opens Sage's scent selector for the elixir or an ingredient.
 * @property {(name: string) => void} selectSageScent Scent selector: fills the slot it was opened for.
 * @property {() => void} clearSageScent Scent selector: empties that slot.
 * @property {(index: number) => void} openCarinoAmmo Opens the Special Ammo selector for slot 0–2.
 * @property {(name: string) => void} selectCarinoAmmo Special Ammo selector: fills the slot it was opened for (a support
 *   the slot can take).
 * @property {() => void} clearCarinoAmmo Special Ammo selector: empties that slot.
 * @property {(index: number) => void} removeCarinoAmmo Empties a Special Ammo slot.
 * @property {(heroId: string) => void} openHeroTraitSupport Opens the support selector for a hero's trait support slot.
 * @property {(heroId: string) => void} removeHeroTraitSupport Empties a hero's trait support slot.
 * @property {(panel: "sheet" | "damage-path") => void} setStatsPanel Stats view: shows the Stat sheet or the Damage path.
 * @property {(key: string) => void} selectStatSheetSkill Shows the stat sheet of another skill (its setup key).
 * @property {(key: string) => void} toggleRecountSource Leaves a recount source out of the view, or brings it back
 *   (view only: the build and its figures are unchanged).
 * @property {() => void} showAllRecountSources Brings every recount source back into the view.
 * @property {(key: string) => void} selectDamagePath Opens another damage path tab ("hit:<setup>", "combined" …).
 * @property {() => Promise<boolean>} copyOpenQuestions Copies the build's open questions as plain text; false when the
 *   clipboard refused (a toast says so).
 */

/**
 * @typedef {object} GearDrop
 * @property {string} itemId The dragged Inventory item.
 * @property {string | null} fromSlot The slot it was dragged out of; null from the Inventory.
 * @property {string | null} toSlot The slot it was dropped on; null on the Inventory (unequips fromSlot).
 */

/**
 * Where a dragged or waiting slate was let go. At most one is set; neither means outside the stage.
 * @typedef {object} SlateDrop
 * @property {{ column: number, row: number, rotation: number, flipX: number, flipY: number } | null} placement The grid
 *   position under it (its top-left cell), when released over the grid.
 * @property {{ x: number, y: number, rotation: number, flipX: number, flipY: number } | null} parked Its top-left in
 *   percent of the stage, when released beside the grid.
 */

/**
 * @typedef {object} SupportMove
 * @property {"skills" | "auras"} tab
 * @property {number} fromRow
 * @property {number} fromSlot
 * @property {string} setupKey The dragged support's setup (the move is refused if the row changed during the drag).
 * @property {number} toRow
 * @property {number} toSlot
 * @property {boolean} duplicate
 */

/** @type {PlannerCommands | null} */
let commands = null;

/** @param {PlannerCommands} implementation */
export function providePlannerCommands(implementation) {
  commands = implementation;
}

/** @returns {PlannerCommands} */
export function plannerCommands() {
  if (!commands) throw new Error("The planner has not started yet");
  return commands;
}
