"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Card, 
  Button, 
  Input, 
  Select, 
  Badge, 
  Modal,
  Spinner,
  ErrorMsg,
} from "@/components/ui";
import { useRouter } from "next/navigation";
import { toast } from "@/components/Toast";
import { parseApiError } from "@/lib/error-parser";
import { createCampaign, getCampaigns, updateCampaign, deleteCampaign } from "@/lib/admin";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
];

const TARGET_OPTIONS = [
  { value: "all", label: "All Users" },
  { value: "registered", label: "Registered Users" },
  { value: "vip", label: "VIP Users" },
  { value: "segment", label: "Specific Segment" },
];

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [newCampaign, setNewCampaign] = useState<{
    name: string;
    description: string;
    message: string;
    start_date: string;
    end_date: string;
    status: "draft" | "active" | "paused" | "completed";
    target: "all" | "registered" | "vip" | "segment";
    target_value: string;
  }>({
    name: "",
    description: "",
    message: "",
    start_date: "",
    end_date: "",
    status: "draft",
    target: "all",
    target_value: "",
  });
  const [showNew, setShowNew] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCampaigns();
      setCampaigns(data);
    } catch (e: any) {
      setError(parseApiError(e, "Failed to load campaigns"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaign.name || !newCampaign.message) {
      toast.error("Name and message are required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (editing?.id) {
        await updateCampaign(editing.id, {
          name: newCampaign.name,
          description: newCampaign.description,
          message: newCampaign.message,
          start_date: newCampaign.start_date,
          end_date: newCampaign.end_date,
          status: newCampaign.status,
          target: newCampaign.target,
          target_value: newCampaign.target_value,
        });
        setEditing(null);
        toast.success("Campaign updated successfully");
      } else {
        await createCampaign({
          name: newCampaign.name,
          description: newCampaign.description,
          message: newCampaign.message,
          start_date: newCampaign.start_date,
          end_date: newCampaign.end_date,
          status: newCampaign.status,
          target: newCampaign.target,
          target_value: newCampaign.target_value,
        });
        toast.success("Campaign created successfully");
      }
      
      setShowNew(false);
      setShowEdit(false);
      setNewCampaign({
        name: "",
        description: "",
        message: "",
        start_date: "",
        end_date: "",
        status: "draft" as const,
        target: "all" as const,
        target_value: "",
      });
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to save campaign");
    } finally {
      setLoading(false);
    }
  }

  const handleEdit = (campaign: any) => {
    setEditing(campaign);
    setNewCampaign({
      name: campaign.name || "",
      description: campaign.description || "",
      message: campaign.message || "",
      start_date: campaign.start_date || "",
      end_date: campaign.end_date || "",
      status: campaign.status || "draft",
      target: campaign.target || "all",
      target_value: campaign.target_value || "",
    });
    setShowEdit(true);
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this campaign?")) return;
    try {
      await deleteCampaign(id);
      toast.success("Campaign deleted successfully");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to delete campaign");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current/30 inline-block mr-4" />
        <span className="text-lg">Loading campaigns...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <h1 className="text-3xl font-bold text-white mb-6">
        Notification Campaigns
      </h1>

      {/* Create Campaign Modal */}
      <Button 
        variant="outline" 
        size="lg" 
        onClick={() => setShowNew(true)}
        className="mb-6"
      >
        + Create New Campaign
      </Button>

      {(showNew || showEdit) && (
        <Modal
          open={showNew || showEdit}
          onClose={() => {
            setShowNew(false);
            setShowEdit(false);
            setEditing(null);
          }}
          title={editing ? "Edit Campaign" : "Create Campaign"}
          description={editing ? "Update notification campaign details" : "Set up a new notification campaign"}
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400">Campaign Name</label>
              <Input
                value={newCampaign.name}
                onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                placeholder="e.g. Festival Bonus"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400">Message</label>
              <Input
                value={newCampaign.message}
                onChange={(e) => setNewCampaign({ ...newCampaign, message: e.target.value })}
                placeholder="Your notification message"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400">Start Date</label>
                <Input
                  type="date"
                  value={newCampaign.start_date}
                  onChange={(e) => setNewCampaign({ ...newCampaign, start_date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400">End Date</label>
                <Input
                  type="date"
                  value={newCampaign.end_date}
                  onChange={(e) => setNewCampaign({ ...newCampaign, end_date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400">Status</label>
              <Select
                value={newCampaign.status}
                onChange={(e) => setNewCampaign({ ...newCampaign, status: e.target.value as "draft" | "active" | "paused" | "completed" })}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400">Target</label>
              <Select
                value={newCampaign.target}
                onChange={(e) => setNewCampaign({ ...newCampaign, target: e.target.value as "all" | "registered" | "vip" | "segment" })}
              >
                {TARGET_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400">Target Value (optional)</label>
              <Input
                value={newCampaign.target_value}
                onChange={(e) => setNewCampaign({ ...newCampaign, target_value: e.target.value })}
                placeholder="e.g. user_id_1,user_id_2"
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" className="flex-1 bg-brand-600 hover:bg-brand-500 text-white">
                Save Campaign
              </Button>
              <Button 
                variant="outline" 
                type="button" 
                onClick={() => {
                  setShowNew(false);
                  setShowEdit(false);
                  setEditing(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Campaigns Table */}
      <div className="bg-slate-900/50 rounded-xl p-6 mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-200">
              <th className="py-3">Campaign</th>
              <th className="py-3">Message</th>
              <th className="py-3">Period</th>
              <th className="py-3">Status</th>
              <th className="py-3">Target</th>
              <th className="py-3 text-right">Metrics</th>
              <th className="py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  No campaigns found. Create your first campaign above.
                </td>
              </tr>
            )}
            {campaigns.map((campaign) => (
              <tr key={campaign.id} className="border-b border-slate-200 hover:bg-slate-900/50">
                <td className="py-3 font-medium text-slate-200">{campaign.name}</td>
                <td className="py-3 truncate text-slate-400">{campaign.message?.substring(0, 50) || "—"}</td>
                <td className="py-3">
                  {campaign.start_date && campaign.end_date
                    ? `${campaign.start_date} - ${campaign.end_date}`
                    : "—"}
                </td>
                <td className="py-3">
                  <Badge
                    color={
                      campaign.status === "active"
                        ? "emerald"
                        : campaign.status === "paused"
                          ? "amber"
                          : campaign.status === "completed"
                            ? "violet"
                            : "slate"
                    }
                  >
                    {campaign.status}
                  </Badge>
                </td>
                <td className="py-3 text-slate-400">
                  {campaign.target === "all"
                    ? "All"
                    : campaign.target === "segment" && campaign.target_value
                      ? `${campaign.target_value.split(",").length} users`
                      : campaign.target}
                </td>
                <td className="py-3 text-right text-slate-500">
                  <span className="font-mono">{campaign.sends || 0} Sends</span>
                  <span className="text-xs ml-2">/{campaign.impressions || 0} Impressions</span>
                  <br />
                  <span className="text-xs ml-2">
                    {campaign.clicks || 0} Clicks / {campaign.opens || 0} Opens
                  </span>
                </td>
                <td className="py-3 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(campaign)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDelete(campaign.id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}