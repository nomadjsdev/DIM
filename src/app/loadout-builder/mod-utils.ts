import { armor2PlugCategoryHashesByName } from 'app/search/d2-known-values';
import { DestinyEnergyType } from 'bungie-api-ts/destiny2';
import _ from 'lodash';
import { DimItem } from '../inventory/item-types';
import { mapArmor2ModToProcessMod, mapDimItemToProcessItem } from './processWorker/mappers';
import { canTakeSlotIndependantMods, generateModPermutations } from './processWorker/processUtils';
import { LockedProcessMods, ProcessItem, ProcessMod } from './processWorker/types';
import {
  bucketsToCategories,
  knownModPlugCategoryHashes,
  LockableBucketHashes,
  LockedArmorElements,
  LockedMod,
  LockedModMap,
  raidPlugCategoryHashes,
  slotSpecificPlugCategoryHashes,
} from './types';

/**
 * Checks that:
 *   1. The armour piece is Armour 2.0
 *   2. The mod matches the Armour energy OR the mod has the any Energy type
 */
export const doEnergiesMatch = (mod: LockedMod, item: DimItem) =>
  item.energy &&
  (!mod.modDef.plug.energyCost ||
    mod.modDef.plug.energyCost.energyType === DestinyEnergyType.Any ||
    mod.modDef.plug.energyCost.energyType === item.energy?.energyType);

/**
 * Checks that the armour energy capacity is less than or equal to the maximum limit provided
 */
export const isEnergyLower = (item: DimItem, limit: number) =>
  item.energy && item.energy.energyCapacity <= limit;

interface LockedMods {
  [plugCategoryHash: number]: LockedMod[];
}
interface ItemMods {
  processMods?: LockedProcessMods;
  lockedMods?: LockedMods;
}
/**
 * Checks if any armor specific mods are set element in order to lock that slot when ignoring armor element
 * Returns an object of key/value pairs representing element / energyType
 */
export const assignEnergyTypeToSlot = ({
  processMods,
  lockedMods,
}: ItemMods): LockedArmorElements => {
  const { helmet, gauntlets, chest, leg, classitem } = armor2PlugCategoryHashesByName;

  return processMods
    ? {
        Helmet:
          processMods[helmet]?.find((mod: ProcessMod) => mod.energy?.type)?.energy?.type ??
          DestinyEnergyType.Any,
        Gauntlets:
          processMods[gauntlets]?.find((mod: ProcessMod) => mod.energy?.type)?.energy?.type ??
          DestinyEnergyType.Any,
        Chest:
          processMods[chest]?.find((mod: ProcessMod) => mod.energy?.type)?.energy?.type ??
          DestinyEnergyType.Any,
        Leg:
          processMods[leg]?.find((mod: ProcessMod) => mod.energy?.type)?.energy?.type ??
          DestinyEnergyType.Any,
        ClassItem:
          processMods[classitem]?.find((mod: ProcessMod) => mod.energy?.type)?.energy?.type ??
          DestinyEnergyType.Any,
      }
    : lockedMods
    ? {
        Helmet:
          lockedMods[helmet]?.find((mod: LockedMod) => mod.modDef.plug.energyCost?.energyType)
            ?.modDef.plug.energyCost?.energyType ?? DestinyEnergyType.Any,
        Gauntlets:
          lockedMods[gauntlets]?.find((mod: LockedMod) => mod.modDef.plug.energyCost?.energyType)
            ?.modDef.plug.energyCost?.energyType ?? DestinyEnergyType.Any,
        Chest:
          lockedMods[chest]?.find((mod: LockedMod) => mod.modDef.plug.energyCost?.energyType)
            ?.modDef.plug.energyCost?.energyType ?? DestinyEnergyType.Any,
        Leg:
          lockedMods[leg]?.find((mod: LockedMod) => mod.modDef.plug.energyCost?.energyType)?.modDef
            .plug.energyCost?.energyType ?? DestinyEnergyType.Any,
        ClassItem:
          lockedMods[classitem]?.find((mod: LockedMod) => mod.modDef.plug.energyCost?.energyType)
            ?.modDef.plug.energyCost?.energyType ?? DestinyEnergyType.Any,
      }
    : {
        Helmet: DestinyEnergyType.Any,
        Gauntlets: DestinyEnergyType.Any,
        Chest: DestinyEnergyType.Any,
        Leg: DestinyEnergyType.Any,
        ClassItem: DestinyEnergyType.Any,
      };
};

/**
 * If the energies match, this will assign the mods to the item in assignments.
 *
 * assignments is mutated in this function as it tracks assigned mods for a particular armour set
 */
function assignModsForSlot(
  item: DimItem,
  assignments: Record<string, number[]>,
  ignoreArmorElement: boolean,
  mods?: LockedMod[]
): void {
  if (mods?.length && (mods.every((mod) => doEnergiesMatch(mod, item)) || ignoreArmorElement)) {
    assignments[item.id] = [...assignments[item.id], ...mods.map((mod) => mod.modDef.hash)];
  }
}

/**
 * Checks to see if the passed in general and other mods can be assigned to the armour set.
 *
 * assignments is mutated in this function as it tracks assigned mods for a particular armour set
 */
function assignSlotIndependantMods(
  setToMatch: ProcessItem[],
  lockedArmor2Mods: LockedModMap,
  assignments: Record<string, number[]>,
  ignoreArmorElement: boolean
): void {
  let generalMods: LockedMod[] = [];
  let otherMods: LockedMod[] = [];
  let raidMods: LockedMod[] = [];
  const lockedMods: LockedMods = {};

  for (const [plugCategoryHashString, mods] of Object.entries(lockedArmor2Mods)) {
    const plugCategoryHash = Number(plugCategoryHashString);

    if (!mods) {
      continue;
    } else if (plugCategoryHash === armor2PlugCategoryHashesByName.general) {
      generalMods = mods;
    } else if (slotSpecificPlugCategoryHashes.includes(plugCategoryHash)) {
      lockedMods[plugCategoryHash] = mods;
    } else if (raidPlugCategoryHashes.includes(plugCategoryHash)) {
      raidMods = raidMods.concat(mods);
    } else if (!knownModPlugCategoryHashes.includes(plugCategoryHash)) {
      otherMods = otherMods.concat(mods);
    }
  }

  if (!generalMods || !otherMods || !raidMods) {
    return;
  }

  const lockedArmorElements = assignEnergyTypeToSlot({ lockedMods });

  // Mods need to be sorted before being passed to the assignment function
  const generalProcessMods = generalMods.map(mapArmor2ModToProcessMod);
  const otherProcessMods = otherMods.map(mapArmor2ModToProcessMod);
  const raidProcessMods = raidMods.map(mapArmor2ModToProcessMod);

  const generalModPermutations = generateModPermutations(generalProcessMods);
  const otherModPermutations = generateModPermutations(otherProcessMods);
  const raidModPermutations = generateModPermutations(raidProcessMods);

  canTakeSlotIndependantMods(
    generalModPermutations,
    otherModPermutations,
    raidModPermutations,
    setToMatch,
    ignoreArmorElement,
    lockedArmorElements,
    assignments
  );
}

export function assignModsToArmorSet(
  setToMatch: readonly DimItem[],
  lockedArmor2Mods: LockedModMap,
  ignoreArmorElement: boolean
): [Record<string, LockedMod[]>, LockedMod[]] {
  const assignments: Record<string, number[]> = {};

  for (const item of setToMatch) {
    assignments[item.id] = [];
  }

  const processItems: ProcessItem[] = [];

  for (const hash of LockableBucketHashes) {
    const item = setToMatch.find((i) => i.bucket.hash === hash);

    if (item) {
      const lockedMods = lockedArmor2Mods[bucketsToCategories[hash]];
      assignModsForSlot(item, assignments, ignoreArmorElement, lockedMods);
      processItems.push(mapDimItemToProcessItem(item, lockedMods));
    }
  }

  assignSlotIndependantMods(processItems, lockedArmor2Mods, assignments, ignoreArmorElement);

  const modsByHash = _.groupBy(
    Object.values(lockedArmor2Mods)
      .flat()
      .filter((x: LockedMod | undefined): x is LockedMod => Boolean(x)),
    (mod) => mod.modDef.hash
  );
  const assignedMods = _.mapValues(assignments, (modHashes) =>
    modHashes.map((modHash) => modsByHash[modHash].pop()).filter((x): x is LockedMod => Boolean(x))
  );
  const assigned = Object.values(assignedMods).flat();
  const unassignedMods = Object.values(lockedArmor2Mods)
    .flat()
    .filter((unassign): unassign is LockedMod =>
      Boolean(unassign && !assigned.some((assign) => assign.key === unassign.key))
    );

  return [assignedMods, unassignedMods];
}
