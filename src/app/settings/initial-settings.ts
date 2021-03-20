import { defaultSettings, Settings as DimApiSettings } from '@destinyitemmanager/dim-api-types';
import { defaultLanguage } from 'app/i18n';

export interface Settings extends DimApiSettings {
  /** Selected columns for the Vault Organizer */
  readonly organizerColumnsGhost: string[];
  /** whether to ignore mods/masterwork/etc for compare pane stats */
  compareBaseStats: boolean;
  /** Item popup sidecar collapsed just shows icon and no character locations */
  sidecarCollapsed: boolean;
  activeMode: boolean;

  /** Whether to ignore armor element for mods in the loadout optimizer. */
  readonly loIgnoreArmorElement: boolean;
  /** The maximum energy level to ignore on armor in the loadout optimizer. */
  readonly loMaxEnergyToIgnore: number;

  /** In "Single Character Mode" DIM pretends you only have one (active) character and all the other characters' items are in the vault. */
  singleCharacter: boolean;
}

export const initialSettingsState: Settings = {
  ...defaultSettings,
  language: defaultLanguage(),
  organizerColumnsGhost: ['icon', 'name', 'locked', 'tag', 'perks', 'notes'],
  compareBaseStats: false,
  sidecarCollapsed: false,
  activeMode: false,
  loIgnoreArmorElement: false,
  loMaxEnergyToIgnore: 8,
  singleCharacter: false,
};
