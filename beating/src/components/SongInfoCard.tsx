// components/SongInfoCard.tsx
import { Card, CardContent } from "./ui/card";
export function SongInfoCard({ title, description, image }: { title: string, description: string, image?: string }) {
  return (
    <Card className="flex flex-wrap min-w-60 gap-6 p-6 bg-[#140a14b0] border-black rounded-lg">
      <CardContent className="p-0">
        <div className="w-[440px] h-[327px] bg-black">
          {image ? <img src={image} className="w-full h-full object-cover" /> : null}
        </div>
      </CardContent>
      <div className="flex flex-col gap-4 flex-1">
        <h2 className="text-6xl font-semibold text-[#e900ff] tracking-tight leading-tight">
          {title}
        </h2>
        <p className="text-3xl text-white">{description}</p>
      </div>
    </Card>
  );
}
