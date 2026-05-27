import { UploadClient } from "./UploadClient";

export const metadata = {
  title: "Sound Admin | ProdBrogy",
  robots: {
    index: false,
    follow: false
  }
};

export default function UploadPage() {
  return <UploadClient />;
}
