import { useState } from "react";
import ShowcaseSection from "../ShowcaseSection";
import { Grid, Stack } from "../../../components/layout";
import { Field, TextInput, SearchInput, Select, Checkbox, Radio, Toggle, Slider, DatePickerPlaceholder } from "../../../components/nova";

export default function InputsSection() {
  const [toggleOn, setToggleOn] = useState(true);
  const [sliderValue, setSliderValue] = useState(40);

  return (
    <ShowcaseSection id="inputs" number={4} title="Inputs" description="Text, Search, Dropdown/Select, Checkbox, Radio, Toggle, Slider, a real date-picker placeholder, and validation states.">
      <Grid>
        <div style={{ gridColumn: "span 3" }}>
          <Field label="Text" htmlFor="showcase-text">
            <TextInput id="showcase-text" placeholder="Symbol (e.g. NVDA)" />
          </Field>
        </div>
        <div style={{ gridColumn: "span 3" }}>
          <Field label="Search" htmlFor="showcase-search">
            <SearchInput id="showcase-search" />
          </Field>
        </div>
        <div style={{ gridColumn: "span 3" }}>
          <Field label="Dropdown / Select" htmlFor="showcase-select">
            <Select id="showcase-select" options={[{ value: "1d", label: "1 Day" }, { value: "1w", label: "1 Week" }, { value: "1m", label: "1 Month" }]} />
          </Field>
        </div>
        <div style={{ gridColumn: "span 3" }}>
          <Field label="Date picker" htmlFor="showcase-date">
            <DatePickerPlaceholder />
          </Field>
        </div>
      </Grid>

      <Stack direction="horizontal" gap={6} wrap align="center">
        <Checkbox id="showcase-checkbox" label="Watchlisted" defaultChecked />
        <Radio id="showcase-radio-1" name="showcase-radio" label="Buy" defaultChecked />
        <Radio id="showcase-radio-2" name="showcase-radio" label="Sell" />
        <Stack direction="horizontal" gap={2} align="center">
          <Toggle checked={toggleOn} onChange={setToggleOn} aria-label="Notifications" />
          <span className="nova-text-sm">Notifications {toggleOn ? "on" : "off"}</span>
        </Stack>
      </Stack>

      <Field label={`Risk tolerance — ${sliderValue}`} htmlFor="showcase-slider">
        <Slider id="showcase-slider" value={sliderValue} onChange={setSliderValue} />
      </Field>

      <Grid>
        <div style={{ gridColumn: "span 4" }}>
          <Field label="Default" htmlFor="showcase-default" state="default">
            <TextInput id="showcase-default" placeholder="Placeholder" />
          </Field>
        </div>
        <div style={{ gridColumn: "span 4" }}>
          <Field label="Error" htmlFor="showcase-error" state="error" hint="A symbol is required.">
            <TextInput id="showcase-error" />
          </Field>
        </div>
        <div style={{ gridColumn: "span 4" }}>
          <Field label="Success" htmlFor="showcase-success" state="success" hint="Looks good.">
            <TextInput id="showcase-success" defaultValue="NVDA" />
          </Field>
        </div>
      </Grid>
    </ShowcaseSection>
  );
}
