import { Select as KSelect, SelectRootProps } from '@kobalte/core/select'
import { Component, Setter } from 'solid-js'
import styles from './select.module.css'
import { ChevronDown } from '../icons/chevron-down'

export interface SelectOption {
  value: string
  label: string
}

export const Select: Component<{ value: SelectOption; onChange: Setter<SelectOption>; options: SelectOption[] }> = (props) => {
  return (
    <KSelect
      value={props.value}
      onChange={props.onChange}
      options={props.options}
      optionValue="value"
			optionTextValue="label"
      itemComponent={(props) => (
        <KSelect.Item item={props.item} class={styles.select__item}>
          <KSelect.ItemLabel>{props.item.rawValue.label}</KSelect.ItemLabel>
          <KSelect.ItemIndicator class={styles['select__item-indicator']}></KSelect.ItemIndicator>
        </KSelect.Item>
      )}
    >
      <KSelect.Trigger class={styles.select__trigger} aria-label="Player model">
        <KSelect.Value<SelectOption> class={styles.select__value}>{state => state.selectedOption().label}</KSelect.Value>
        <KSelect.Icon class={styles.select__icon}>
          <ChevronDown />
        </KSelect.Icon>
      </KSelect.Trigger>
      <KSelect.Portal>
        <KSelect.Content class={styles.select__content}>
          <KSelect.Listbox class={styles.select__listbox} />
        </KSelect.Content>
      </KSelect.Portal>
    </KSelect>
  )
}
