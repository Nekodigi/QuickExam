'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  XAxis,
} from 'recharts';
import useSWR from 'swr';

import { ElemType } from '@/types/element';
import { AllResponse } from '@/types/response';
import { Button } from '@/components/ui/button';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { useEditorContext } from '@/components/context/editor';

export default function Result() {
  // fetch from api using useSWR
  //result
  const { elemSave } = useEditorContext();
  const path = usePathname();
  const id = path.split('/').pop() || '';
  const fetcher = (url: string) => fetch(url).then((res) => res.json());
  const { data, error }: { data: { data: AllResponse }; error: any } = useSWR(
    `/api/result?id=${id}`,
    fetcher,
    { revalidateOnReconnect: true }
  );

  const summarizeRadio = (correct: number[], data: number[][]) => {
    let result: [{ option: string; count: number; fill: string }] = [] as any;
    data.forEach((answers) => {
      const a = answers[0];
      const index = result.findIndex((r) => r.option === a.toString());
      if (index !== -1) {
        result[index].count++;
      } else {
        result.push({
          option: a.toString(),
          count: 1,
          fill:
            correct[0] === a ? 'var(--color-correct)' : 'var(--color-wrong)',
        });
      }
    });
    const chartConfig = {
      count: {
        label: 'count',
        color: 'hsl(var(--chart-1))',
      },
      correct: {
        label: 'correct',
        color: 'hsl(var(--chart-1))',
      },
      wrong: {
        label: 'wrong',
        color: 'hsl(var(--chart-2))',
      },
    } satisfies ChartConfig;
    return (
      <ChartContainer className="w-96" config={chartConfig}>
        <BarChart accessibilityLayer data={result}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="option"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            tickFormatter={(value) => value.slice(0, 3)}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
          <Bar dataKey="count" fill="var(--color-count)" radius={8}>
            <LabelList
              position="top"
              offset={12}
              className="fill-foreground"
              fontSize={12}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    );
  };

  const summarizeMatrix = (correct: number[][], data: [number[][]]) => {
    return correct.map((c, i) => {
      return summarizeRadio(
        c,
        data.map((d) => d[i])
      );
    });
  };

  const summarizeText = (correct: string[], data: string[][]) => {
    return summarizeRadio(
      correct as any as number[],
      data as any as number[][]
    );
  };

  const summarize = (
    type: ElemType,
    correct: number[][] | number[] | string[],
    data: [number[][] | number[] | string[]]
  ) => {
    switch (type) {
      case 'radio':
        return summarizeRadio(
          correct as any as number[],
          data as any as [number[]]
        );
      case 'matrix':
        return summarizeMatrix(
          correct as any as number[][],
          data as any as [number[][]]
        );
      case 'text':
      case 'paragraph':
        return summarizeText(
          correct as any as string[],
          data as any as string[][]
        );
      default:
        return <div>Not implemented</div>;
    }
  };

  type Overview = {
    pointDist: number[];
    possiblePoint: number;
    radar: { [key: string]: number };
    radarMax: { [key: string]: number };
  };
  const overview = () => {
    if (!data) return;
    let result: Overview = {
      pointDist: new Array(data.data.userIdList.length).fill(0),
      radar: {},
      radarMax: {},
      possiblePoint: 0,
    };
    data.data.answersList.forEach((answer) => {
      let id = answer.id;
      //get corresponding from elemSave
      let question = elemSave?.elements.find((elem) => elem.id === id);
      if (!question) console.error('Question not found with id: ', id);
      let average = 0;
      switch (question?.type) {
        case 'radio':
          let correct = answer.correctAnswers[0];
          answer.answersList.forEach((answers, i) => {
            let a = answers[0];
            if (a.toString() === correct.toString()) {
              result.pointDist[i] += question.point;
              average += question.point;
            }
          });
          break;
        case 'matrix':
          answer.correctAnswers.forEach((correct, i) => {
            answer.answersList.forEach((answers, j) => {
              let a = answers[i];
              if (a.toString() === correct.toString()) {
                result.pointDist[j] +=
                  question.point / answer.correctAnswers.length;
                average += question.point / answer.correctAnswers.length;
              }
            });
          });
          break;
        case 'text':
        case 'paragraph':
          answer.correctAnswers.forEach((correct, i) => {
            answer.answersList.forEach((answers, j) => {
              let a = answers[i];
              if (a === correct) {
                result.pointDist[j] += question.point;
                average += question.point;
              }
            });
          });
          break;
        default:
          console.error('Not implemented');
      }
      average /= answer.answersList.length;
      question?.tags.forEach((tag, i) => {
        result.radar[tag] = average;
        result.radarMax[tag] = question.point;
        result.possiblePoint += question.point;
      });
    });
    return result;
  };
  const visualizeOverview = (overview?: Overview) => {
    if (!overview) return;
    console.log(overview);
    const average =
      overview.pointDist.reduce((a, b) => a + b, 0) / overview.pointDist.length;
    const sd = Math.sqrt(
      overview.pointDist.reduce((a, b) => a + (b - average) ** 2, 0) /
        overview.pointDist.length
    );
    const n = 10;
    let pointHistogram = new Array(n + 1).fill(0);
    overview.pointDist.forEach((point) => {
      pointHistogram[
        Math.min(Math.floor((point / overview.possiblePoint) * n) + 1, n)
      ]++;
    });
    pointHistogram = pointHistogram.map((count, i) => ({
      point: `${(overview.possiblePoint / n) * i}`,
      count,
    }));
    pointHistogram.reverse();
    const areaConfig = {
      count: {
        label: '人数',
        color: 'hsl(var(--chart-1))',
      },
      // point: {
      //   label: '点数',
      //   color: 'hsl(var(--chart-1))',
      // },
    } satisfies ChartConfig;
    //radar chart
    const radarData = Object.keys(overview.radar).map((key) => ({
      tag: key,
      point: (overview.radar[key] / overview.radarMax[key]) * 100,
    }));
    const radarConfig = {
      point: {
        label: '正解率',
        color: 'hsl(var(--chart-1))',
      },
    } satisfies ChartConfig;
    const possiblePointStep = overview.possiblePoint / n;

    return (
      <div>
        <h2>平均{average}点</h2>
        <h2>標準偏差{sd}</h2>
        <ChartContainer className="w-96" config={areaConfig}>
          <AreaChart
            accessibilityLayer
            data={pointHistogram}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="point"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => `${value}点`}
              interval={0}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent />}
              labelFormatter={(value) =>
                `${value}点-${value - possiblePointStep}点`
              }
            />
            <Area
              type="stepAfter"
              dataKey="count"
              fill="var(--color-point)"
              radius={8}
            />
          </AreaChart>
        </ChartContainer>
        <ChartContainer className="w-96" config={radarConfig}>
          <RadarChart
            data={radarData}
            outerRadius="80%"
            margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <PolarGrid />
            <PolarAngleAxis dataKey="tag" />
            <PolarRadiusAxis domain={[0, 100]} axisLine={false} tick={false} />
            <Radar
              dataKey="point"
              stroke="var(--color-point)"
              fill="var(--color-point)"
              fillOpacity={0.6}
            />
          </RadarChart>
        </ChartContainer>
      </div>
    );
  };

  const onDownloadExam = () => {
    if (!elemSave) return;
    const json = JSON.stringify(elemSave);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${elemSave?.id}_exam.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const onDownloadResult = () => {
    if (!data) return;
    const json = JSON.stringify(data.data);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${elemSave?.id}_result.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const onDownloadResultAsCSV = () => {
    if (!data) return;
    let res = 'ユーザーID,提出日時,提出ID,';
    let count = 1;
    //Making header
    for (let answer of data.data.answersList) {
      console.log(
        answer.correctAnswers,
        isNaN((answer.correctAnswers as number[][])[0][0])
      );
      if (isNaN((answer.correctAnswers as number[][])[0][0])) {
        res += count++ + '.' + answer.title + ',';
      } else {
        for (let i = 0; i < answer.correctAnswers.length; i++) {
          res += `${count}.${i}.${answer.title},`;
        }
        count++;
      }
    }
    res += '\n';
    for (let i = 0; i < data.data.userIdList.length; i++) {
      res += data.data.userIdList[i] + ',';
      //convert to local time string
      let dateStr = new Date(data.data.submissionTimeList[i]).toLocaleString();
      //escape
      dateStr = dateStr.replace(/,/g, ' ');
      res += dateStr + ',';
      res += data.data.responseIdList[i] + ',';
      for (let answer of data.data.answersList) {
        if (isNaN((answer.correctAnswers as number[][])[0][0])) {
          res += answer.answersList[i][0] + ',';
        } else {
          //asserting cast to avoid error
          for (let j = 0; j < answer.correctAnswers.length; j++) {
            res += (answer.answersList as [number[][]])[i][j][0] + ',';
          }
        }
      }
      res += '\n';
    }
    const bom = new Uint8Array([0xef, 0xbb, 0xbf]); //UTF-8 BOM
    const blob = new Blob([bom, res], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${elemSave?.id}_result.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex w-full min-w-0 max-w-full justify-center">
      <div className="flex w-full max-w-screen-sm flex-col gap-8 p-0 md:p-16">
        <div className="flex w-full flex-col gap-2">
          <h1 className="scroll-m-20 pb-2 text-4xl font-bold tracking-tight first:mt-0">
            {elemSave?.title}
          </h1>
        </div>
        <div className="flex flex-row gap-4">
          <Button asChild>
            <Link href={`/editor/${elemSave?.id}`}>問題を見る</Link>
          </Button>
          <Button onClick={onDownloadExam}>問題のダウンロード</Button>
          <Button onClick={onDownloadResultAsCSV}>
            回答結果のダウンロード
          </Button>
        </div>
        {visualizeOverview(overview())}
        {data?.data.answersList?.map((question) => {
          return (
            <div key={question.id}>
              <h1 className="text-xl font-bold">{question.title}</h1>
              {summarize(
                question.type,
                question.correctAnswers,
                question.answersList
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
