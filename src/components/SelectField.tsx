import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Option } from "@/lib/form-options";

type Props = {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: readonly Option[];
  placeholder: string;
  error?: boolean;
};

/** Labelled Radix Select used for "Employment Status" and "Approximate Credit Score". */
export const SelectField = ({ label, required, value, onChange, options, placeholder, error }: Props) => (
  <div>
    <label className="block text-xs font-semibold text-zinc-500 mb-1.5 font-sans uppercase tracking-widest">
      {label} {required && <span className="text-primary">*</span>}
    </label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={`h-auto py-3 text-sm font-sans ${error ? "border-red-400 ring-2 ring-red-100" : ""}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} className="text-sm font-sans">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);
