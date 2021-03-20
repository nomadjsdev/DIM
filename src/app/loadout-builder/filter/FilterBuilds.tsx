import { D2ManifestDefinitions } from 'app/destiny2/d2-definitions';
import { t } from 'app/i18next-t';
import { setSetting } from 'app/settings/actions';
import _ from 'lodash';
import React from 'react';
import { useDispatch } from 'react-redux';
import { MinMax, MinMaxIgnored, statHashes, StatTypes } from '../types';
import styles from './FilterBuilds.m.scss';
import TierSelect from './TierSelect';

/**
 * Temporary component to act as a stand in for the RangeSelector that was removed in PR6583
 */
const RangeSelector = ({ min, max, initialValue, onChange }) => (
  <div>
    RangeSelector placeholder ({min}, {max}){' '}
    <button type="button" onClick={onChange}>
      {initialValue}
    </button>
  </div>
);

/**
 * A control for filtering builds by stats, and controlling the priority order of stats.
 */
export default function FilterBuilds({
  statRanges,
  stats,
  defs,
  order,
  assumeMasterwork,
  ignoreArmorElement,
  maxEnergyToIgnore,
  onStatFiltersChanged,
}: {
  statRanges?: { [statType in StatTypes]: MinMax };
  stats: { [statType in StatTypes]: MinMaxIgnored };
  defs: D2ManifestDefinitions;
  order: StatTypes[];
  assumeMasterwork: boolean;
  ignoreArmorElement: boolean;
  maxEnergyToIgnore: number;
  onStatFiltersChanged(stats: { [statType in StatTypes]: MinMaxIgnored }): void;
}) {
  const dispatch = useDispatch();

  const onStatOrderChanged = (sortOrder: StatTypes[]) => {
    dispatch(
      setSetting(
        'loStatSortOrder',
        sortOrder.map((type) => statHashes[type])
      )
    );
  };

  const workingStatRanges =
    statRanges || _.mapValues(statHashes, () => ({ min: 0, max: 10, ignored: false }));

  return (
    <div>
      <div className={styles.filters}>
        <TierSelect
          rowClassName={styles.row}
          stats={stats}
          statRanges={workingStatRanges}
          defs={defs}
          order={order}
          onStatFiltersChanged={onStatFiltersChanged}
          onStatOrderChanged={onStatOrderChanged}
        />
        <div className={styles.filterCheckbox} title={t('LoadoutBuilder.AssumeMasterworkDetailed')}>
          <input
            id="lo-assume-masterwork"
            type="checkbox"
            checked={assumeMasterwork}
            onChange={(e) => dispatch(setSetting('loAssumeMasterwork', e.target.checked))}
          />
          <label htmlFor="lo-assume-masterwork">{t('LoadoutBuilder.AssumeMasterwork')}</label>
        </div>
        <div
          className={styles.filterCheckbox}
          title={t('LoadoutBuilder.IgnoreArmorElementDetailed')}
        >
          <input
            id="ignoreArmorElement"
            type="checkbox"
            checked={ignoreArmorElement}
            onChange={(e) => dispatch(setSetting('loIgnoreArmorElement', e.target.checked))}
          />
          <label htmlFor="ignoreArmorElement">{t('LoadoutBuilder.IgnoreArmorElement')}</label>
        </div>
        {ignoreArmorElement && (
          <div className={styles.filterRange}>
            <label id="maxEnergyToIgnore" title={t('LoadoutBuilder.SelectMaxEnergyDetailed')}>
              {t('LoadoutBuilder.SelectMaxEnergy')}
            </label>
            <RangeSelector
              min={0}
              max={10}
              initialValue={maxEnergyToIgnore}
              onChange={(maxEnergyToIgnore: number) =>
                dispatch(setSetting('loMaxEnergyToIgnore', maxEnergyToIgnore))
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
