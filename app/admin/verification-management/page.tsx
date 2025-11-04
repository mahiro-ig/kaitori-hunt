// app/admin/verification-management/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

type VerRow = {
  id: string;
  user_id: string;
  face_path: string;
  status: "pending" | "approved" | "rejected";
  users: { id_photo_path: string }[];
};

type VerificationItem = {
  id: string;
  userId: string;
  idPhotoUrl: string;
  faceUrl: string;
  status: "pending" | "approved" | "rejected";
};

export default function VerificationManagementPage() {
  const [items, setItems] = useState<VerificationItem[]>([]);

  useEffect(() => {
    (async () => {
      // 1) 本人確認レコードを取得
      const { data, error } = await supabase
        .from("verifications")
        .select("id,user_id,face_path,status,users(id_photo_path)");

      if (error) {
        console.error("fetch verifications error:", error);
        return;
      }
      // 取得結果を VerRow[] として扱う
      const rows = (data ?? []) as VerRow[];

      // 2) 各画像のサインド URL を取得
      const loaded = await Promise.all(
        rows.map(async (r) => {
          const userPhotoPath = r.users[0]?.id_photo_path;
          const { data: idData, error: idErr } = await supabase
            .storage
            .from("id-photos")
            .createSignedUrl(userPhotoPath, 60);
          const { data: faceData, error: faceErr } = await supabase
            .storage
            .from("face-captures")
            .createSignedUrl(r.face_path, 60);

          return {
            id: r.id,
            userId: r.user_id,
            idPhotoUrl: idErr || !idData?.signedUrl ? "" : idData.signedUrl,
            faceUrl: faceErr || !faceData?.signedUrl ? "" : faceData.signedUrl,
            status: r.status,
          };
        })
      );

      setItems(loaded);
    })();
  }, []);

  // ステータス更新ハンドラ
  const updateStatus = async (id: string, newStatus: "approved" | "rejected") => {
    const { error } = await supabase
      .from("verifications")
      .update({ status: newStatus })
      .eq("id", id);
    if (error) {
      console.error("status update error:", error);
      return;
    }
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, status: newStatus } : it))
    );
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">本人確認管理</h1>
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center space-x-4 p-4 border rounded"
        >
          <div className="space-y-2">
            <img
              src={item.idPhotoUrl}
              alt="ID写真"
              className="w-24 h-24 object-cover rounded"
            />
            <img
              src={item.faceUrl}
              alt="撮影写真"
              className="w-24 h-24 object-cover rounded"
            />
          </div>
          <div className="flex-1">
            <p>User ID: {item.userId}</p>
            <p>
              Status:{" "}
              <span
                className={`font-semibold ${
                  item.status === "pending"
                    ? "text-yellow-600"
                    : item.status === "approved"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {item.status === "pending"
                  ? "審査待ち"
                  : item.status === "approved"
                  ? "承認済み"
                  : "拒否"}
              </span>
            </p>
          </div>
          {item.status === "pending" && (
            <div className="space-x-2">
              <Button onClick={() => updateStatus(item.id, "approved")}>
                承認
              </Button>
              <Button
                variant="destructive"
                onClick={() => updateStatus(item.id, "rejected")}
              >
                拒否
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
