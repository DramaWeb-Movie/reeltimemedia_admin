import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

interface SinglePricingSectionProps {
  price: string;
  setPrice: (value: string) => void;
}

export function SinglePricingSection({ price, setPrice }: SinglePricingSectionProps) {
  return (
    <Card padding="lg">
      <CardHeader title="Pricing" subtitle="One-time purchase price in USD." />
      <div className="mt-1">
        <Input
          label="Price (USD)"
          type="number"
          step="0.01"
          min="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="2.99"
        />
      </div>
    </Card>
  );
}
