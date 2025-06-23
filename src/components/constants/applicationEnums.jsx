export const ApplicationStatus = {
  KUTILYABDI: 'KUTILYABDI',
  BOGLANILDI: 'BOGLANILDI',
};

export const ApplicationStatusUz = {
  [ApplicationStatus.KUTILYABDI]: "Kutilyapti",
  [ApplicationStatus.BOGLANILDI]: "Bog'lanildi",
};

export const ApplicationStatusColors = {
  [ApplicationStatus.KUTILYABDI]: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  [ApplicationStatus.BOGLANILDI]: 'bg-green-100 text-green-700 border-green-300',
};

export const statusOptions = [
  { value: ApplicationStatus.KUTILYABDI, label: ApplicationStatusUz[ApplicationStatus.KUTILYABDI] },
  { value: ApplicationStatus.BOGLANILDI, label: ApplicationStatusUz[ApplicationStatus.BOGLANILDI] },
];
