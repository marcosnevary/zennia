<script lang="ts">
  import Monitor from "@lucide/svelte/icons/monitor";
  import Moon from "@lucide/svelte/icons/moon";
  import Sun from "@lucide/svelte/icons/sun";
  import type { Component } from "svelte";
  import SettingRow from "./SettingRow.svelte";
  import SegmentedControl from "#lib/components/SegmentedControl.svelte";
  import Switch from "#lib/components/Switch.svelte";
  import { THEMES, type ThemePreference } from "#lib/data/theme.ts";
  import { getApp } from "#lib/state.svelte.ts";

  const app = getApp();

  const THEME_ICONS: Record<ThemePreference, Component> = {
    system: Monitor,
    light: Sun,
    dark: Moon,
  };
</script>

<div class="divide-y divide-tint">
  <SettingRow title="Theme" description="Light, dark, or match your system.">
    <SegmentedControl
      options={THEMES.map((t) => ({ ...t, icon: THEME_ICONS[t.id] }))}
      value={app.settings.theme}
      onchange={(theme) => app.setTheme(theme)}
      label="Theme"
    />
  </SettingRow>

  <SettingRow
    title="Switch tabs with number keys"
    description="Press 1 to 4 to open each tab."
  >
    <div class="flex sm:justify-end">
      <Switch
        checked={app.settings.numberKeyTabs}
        onchange={() => app.setNumberKeyTabs(!app.settings.numberKeyTabs)}
        label="Switch tabs with number keys"
      />
    </div>
  </SettingRow>
</div>
