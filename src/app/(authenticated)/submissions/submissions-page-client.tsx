'use client';

import { useMemo, useState } from 'react';
import { Edit, Loader2, AlertTriangle, Info, Eye } from 'lucide-react';
import { SubmissionsList } from '@/components/submissions/submissions-list';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileUpload, UploadedFile } from '@/components/ui/file-upload';
import { ActivitySubmissionForm } from '@/components/submissions/activity-submission-form';
import { SubmissionReview } from '@/components/submissions/submission-review';
import { useSubmission, useEditSubmissionMutation } from '@/hooks/use-submission';
import { useEvidenceFile } from '@/hooks/use-evidence-file';

interface Practitioner {
  MaNhanVien: string;
  HoVaTen: string;
  SoCCHN: string | null;
  ChucDanh: string | null;
}

interface SubmissionsPageClientProps {
  userRole: string;
  practitioners: Practitioner[];
  initialPractitionerId?: string;
}

const getFileNameFromUrl = (url: string): string => {
  try {
    const sanitized = url.split('?')[0] || '';
    const segments = sanitized.split('/');
    return decodeURIComponent(segments.pop() || 'evidence');
  } catch {
    return 'evidence';
  }
};

const getFileExtensionFromUrl = (url: string): string => {
  const filename = getFileNameFromUrl(url);
  const ext = filename.split('.').pop();
  return ext ? ext.toUpperCase() : 'FILE';
};

export function SubmissionsPageClient({ userRole, practitioners, initialPractitionerId }: SubmissionsPageClientProps) {
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [showViewSheet, setShowViewSheet] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [selectedEditSubmissionId, setSelectedEditSubmissionId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editUploadedFiles, setEditUploadedFiles] = useState<UploadedFile[]>([]);
  const [editFileUploadError, setEditFileUploadError] = useState<string | null>(null);

  const preparedPractitioners = useMemo(() => (
    (practitioners || []).map(p => ({
      MaNhanVien: p.MaNhanVien,
      HoVaTen: p.HoVaTen,
      SoCCHN: p.SoCCHN ?? null,
      ChucDanh: p.ChucDanh ?? null,
    }))
  ), [practitioners]);

  // Fetch submission data for edit dialog
  const { data: editSubmissionData } = useSubmission(selectedEditSubmissionId || '');
  const editSubmission = editSubmissionData?.submission || null;
  const editMutation = useEditSubmissionMutation();
  const evidenceFile = useEvidenceFile();

  const evidenceFileName = editSubmission?.FileMinhChungUrl ? getFileNameFromUrl(editSubmission.FileMinhChungUrl) : null;
  const evidenceFileExtension = editSubmission?.FileMinhChungUrl ? getFileExtensionFromUrl(editSubmission.FileMinhChungUrl) : null;

  const handleCreateSubmission = () => {
    setShowCreateSheet(true);
  };

  const handleViewSubmission = (id: string) => {
    setSelectedSubmissionId(id);
    setShowViewSheet(true);
  };

  const handleEditSubmission = (id: string) => {
    setSelectedEditSubmissionId(id);
    setShowEditDialog(true);
  };

  const handleCreated = () => {
    setShowCreateSheet(false);
    setRefreshKey(k => k + 1);
  };

  const handleReviewComplete = () => {
    setRefreshKey(k => k + 1);
  };

  const handleEditComplete = () => {
    setShowEditDialog(false);
    setSelectedEditSubmissionId(null);
    setEditUploadedFiles([]);
    setEditFileUploadError(null);
    setRefreshKey(k => k + 1);
  };

  const handleEditDialogClose = (open: boolean) => {
    setShowEditDialog(open);
    if (!open) {
      setSelectedEditSubmissionId(null);
      setEditUploadedFiles([]);
      setEditFileUploadError(null);
    }
  };

  return (
    <>
      <SubmissionsList
        userRole={userRole}
        onCreateSubmission={handleCreateSubmission}
        onViewSubmission={handleViewSubmission}
        onEditSubmission={handleEditSubmission}
        refreshKey={refreshKey}
        practitioners={preparedPractitioners}
      />

      {/* Create Submission Sheet */}
      <Sheet open={showCreateSheet} onOpenChange={setShowCreateSheet}>
        <SheetContent side="right" className="w-full sm:max-w-3xl flex flex-col p-0">
          <div className="flex-shrink-0 border-b border-gray-200 px-6 py-4">
            <SheetHeader>
              <SheetTitle>Ghi nhận hoạt động</SheetTitle>
              <SheetDescription>Gửi hoạt động đào tạo liên tục để được phê duyệt</SheetDescription>
            </SheetHeader>
          </div>
          <div className="flex-1 overflow-y-auto px-6">
            <ActivitySubmissionForm
              userRole={userRole}
              practitioners={preparedPractitioners}
              redirectOnSuccess={false}
              onSubmit={handleCreated}
              onCancel={() => setShowCreateSheet(false)}
              initialPractitionerId={initialPractitionerId}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* View Submission Sheet */}
      <Sheet
        open={showViewSheet}
        onOpenChange={(open) => {
          setShowViewSheet(open);
          if (!open) setSelectedSubmissionId(null);
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Chi tiết hoạt động</SheetTitle>
            <SheetDescription>Xem xét và phê duyệt hoạt động đào tạo liên tục</SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            {selectedSubmissionId && (
              <SubmissionReview
                submissionId={selectedSubmissionId}
                userRole={userRole}
                showHeading={false}
                onBack={() => setShowViewSheet(false)}
                onReviewComplete={handleReviewComplete}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Submission Dialog */}
      <Dialog open={showEditDialog} onOpenChange={handleEditDialogClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa hoạt động</DialogTitle>
          </DialogHeader>

          {editSubmission ? (
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-ten-hoat-dong">Tên hoạt động *</Label>
                <Input
                  id="edit-ten-hoat-dong"
                  defaultValue={editSubmission.TenHoatDong}
                  placeholder="Nhập tên hoạt động"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-so-tiet">Số tiết</Label>
                  <Input
                    id="edit-so-tiet"
                    type="number"
                    defaultValue={editSubmission.SoTiet || ''}
                    placeholder="Số tiết"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-so-gio-tin-chi">Số giờ tín chỉ *</Label>
                  <Input
                    id="edit-so-gio-tin-chi"
                    type="number"
                    step="0.5"
                    defaultValue={editSubmission.SoGioTinChiQuyDoi ?? ''}
                    placeholder="Số giờ tín chỉ"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-don-vi-to-chuc">Đơn vị tổ chức</Label>
                <Input
                  id="edit-don-vi-to-chuc"
                  defaultValue={editSubmission.DonViToChuc || ''}
                  placeholder="Tên đơn vị tổ chức"
                />
              </div>

              {/* Evidence File Section */}
              <div>
                <Label>Tệp minh chứng</Label>

                {/* Show current evidence file if exists */}
                {editSubmission.FileMinhChungUrl && editUploadedFiles.length === 0 && (
                  <div className="mt-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-medical-blue/10 text-xs font-semibold text-medical-blue">
                          {evidenceFileExtension || 'FILE'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{evidenceFileName || 'Tệp minh chứng hiện tại'}</p>
                          <p className="text-xs text-gray-500">Đã tải lên trước đó</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => editSubmission.FileMinhChungUrl && evidenceFile.viewFile(editSubmission.FileMinhChungUrl)}
                        disabled={evidenceFile.isLoading}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* File Upload Component */}
                <div className="mt-2">
                  <FileUpload
                    onUpload={(files) => {
                      setEditUploadedFiles(files);
                      setEditFileUploadError(null);
                    }}
                    onError={(error) => {
                      setEditFileUploadError(error);
                    }}
                    maxFiles={1}
                    maxSize={10}
                    acceptedTypes={['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']}
                  />
                  {editFileUploadError && (
                    <Alert className="mt-2 border-red-200 bg-red-50">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-700 text-sm">
                        {editFileUploadError}
                      </AlertDescription>
                    </Alert>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {editUploadedFiles.length > 0
                      ? 'Tệp mới sẽ thay thế tệp hiện tại'
                      : editSubmission.FileMinhChungUrl
                        ? 'Tải lên tệp mới để thay thế (không bắt buộc)'
                        : 'Tải lên tệp minh chứng (PDF, JPG, PNG, tối đa 10MB)'}
                  </p>
                </div>
              </div>

              <Alert className="border-medical-blue bg-medical-blue/5">
                <Info className="h-4 w-4 text-medical-blue" />
                <AlertDescription className="text-sm text-gray-700">
                  Chỉ có thể chỉnh sửa hoạt động đang ở trạng thái <strong>Chờ duyệt</strong>.
                  Thông tin người hành nghề không thể thay đổi.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">Đang tải...</div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline-accent"
              onClick={() => handleEditDialogClose(false)}
              disabled={editMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={async () => {
                if (!editSubmission || !selectedEditSubmissionId) return;

                const tenHoatDong = (document.getElementById('edit-ten-hoat-dong') as HTMLInputElement)?.value;
                const soTiet = (document.getElementById('edit-so-tiet') as HTMLInputElement)?.value;
                const soGioTinChi = (document.getElementById('edit-so-gio-tin-chi') as HTMLInputElement)?.value;
                const donViToChuc = (document.getElementById('edit-don-vi-to-chuc') as HTMLInputElement)?.value;

                // Determine file URL: use new upload if exists, otherwise keep existing
                const fileUrl = editUploadedFiles.length > 0
                  ? editUploadedFiles[0].url
                  : editSubmission.FileMinhChungUrl;

                try {
                  await editMutation.mutateAsync({
                    id: selectedEditSubmissionId,
                    data: {
                      TenHoatDong: tenHoatDong,
                      SoTiet: soTiet ? parseFloat(soTiet) : null,
                      SoGioTinChiQuyDoi: soGioTinChi ? parseFloat(soGioTinChi) : undefined,
                      DonViToChuc: donViToChuc || null,
                      FileMinhChungUrl: fileUrl,
                    },
                  });
                  handleEditComplete();
                } catch (err) {
                  // Error handled by mutation
                }
              }}
              disabled={editMutation.isPending || !editSubmission}
            >
              {editMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Đang lưu...</>
              ) : (
                <><Edit className="h-4 w-4 mr-2" /> Lưu thay đổi</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
