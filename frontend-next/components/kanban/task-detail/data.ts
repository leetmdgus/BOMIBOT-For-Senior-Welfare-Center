import type { EvaluationFile, Survey } from "./types"

export const surveysData: Survey[] = [
  {
    id: "1",
    title: "경로식당 이용 만족도 조사",
    program: "춘천북부노인복지관 경로식당 운영사업",
    date: "2025. 7. 27. 오후 2:00",
    status: "진행중",
    endDate: "2025-08-10",
  },
  {
    id: "2",
    title: "스마트폰 활용 교육 만족도 조사",
    program: "디지털 역량강화 프로그램",
    status: "완료",
    endDate: "2025-06-30",
  },
  {
    id: "3",
    title: "노년사회화교육 상반기 만족도 조사",
    program: "노년사회화교육 지원사업",
    status: "예정",
    endDate: "2025-09-15",
  },
  {
    id: "4",
    title: "건강체조 프로그램 참여자 평가",
    program: "어르신 건강증진 프로그램",
    status: "진행중",
    endDate: "2025-08-31",
  },
  {
    id: "5",
    title: "독거노인 정서지원 서비스 만족도 조사",
    program: "지역사회 통합돌봄 사업",
    status: "임시",
    endDate: "2025-10-01",
  },
]

export const filesData: EvaluationFile[] = [
  {
    id: "1",
    name: "2025 노년사회화교육 사업 평가서",
    type: "평가서",
  },
  {
    id: "2",
    name: "2025 경로식당 운영 실적 내역서",
    type: "내역서",
  },
  {
    id: "3",
    name: "2025 건강증진 프로그램 운영 지침서",
    type: "지침서",
  },
  {
    id: "4",
    name: "2025 상반기 만족도 조사 결과표",
    type: "결과표",
  },
]

export const statusStyles = {
  진행중: "bg-amber-100 text-amber-700",
  완료: "bg-blue-100 text-blue-700",
  예정: "bg-red-100 text-red-700",
  임시: "bg-gray-100 text-gray-600",
}