import React from 'react';
import { 
    CheckCircleIcon, XIcon, InformationCircleIcon, KeyIcon, CreditCardIcon, LightbulbIcon,
    ImageIcon, VideoIcon, MegaphoneIcon, RobotIcon, LibraryIcon, SettingsIcon,
    GalleryIcon, AlertTriangleIcon
} from '../Icons';
import { type Language } from '../../types';
import { getTranslations } from '../../services/translations';

const Section: React.FC<{ title: string; children: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }> = ({ title, children, icon: Icon }) => (
    <div className="py-6 border-b border-neutral-200 dark:border-neutral-800 last:border-b-0">
        <h3 className="text-xl font-bold text-neutral-800 dark:text-white mb-4 sm:text-2xl flex items-center gap-3">
            {Icon && <Icon className="w-6 h-6 text-primary-500 flex-shrink-0" />}
            {title}
        </h3>
        <div className="space-y-4 text-neutral-600 dark:text-neutral-300">{children}</div>
    </div>
);

const SubSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mt-6">
        <h4 className="text-lg font-semibold text-neutral-700 dark:text-neutral-200 mb-2">{title}</h4>
        <div className="space-y-3 text-sm leading-relaxed">{children}</div>
    </div>
);

interface GetStartedViewProps {
    language: Language;
}

const GetStartedView: React.FC<GetStartedViewProps> = ({ language }) => {
    const T = getTranslations(language).getStartedView;

    return (
        <div className="max-w-7xl mx-auto">
            <div className="text-left mb-10">
                <h1 className="text-3xl font-extrabold text-neutral-900 dark:text-white sm:text-4xl">
                    {T.title}
                </h1>
                <p className="mt-3 text-lg text-neutral-500 dark:text-neutral-400">
                    {T.subtitle}
                </p>
            </div>

            <div className="bg-white dark:bg-neutral-900 p-6 sm:p-8 rounded-lg shadow-lg">

                <Section title={T.overviewTitle} icon={InformationCircleIcon}>
                    <p>{T.overviewP1}</p>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>{T.overviewL1}</li>
                      <li>{T.overviewL2}</li>
                    </ul>
                    <p>{T.overviewP2}</p>
                </Section>

                <Section title={T.ch1Title} icon={KeyIcon}>
                    <SubSection title={T.ch1s1Title}>
                        <p>{T.ch1s1P1}</p>
                    </SubSection>
                    <SubSection title={T.ch1s2Title}>
                        <p className="font-semibold text-green-600 dark:text-green-400">{T.ch1s2P1}</p>
                        <p>{T.ch1s2P2}</p>
                        <p>{T.ch1s2P3}</p>
                    </SubSection>
                </Section>
                
                <Section title={T.ch2Title} icon={CreditCardIcon}>
                    <p className="font-semibold">{T.ch2P1}</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>{T.ch2L1}</li>
                        <li>{T.ch2L2}</li>
                        <li>{T.ch2L3}</li>
                    </ul>
                </Section>
                
                <Section title={T.ch3Title} icon={LightbulbIcon}>
                    <p>{T.ch3P1}</p>
                     <ul className="list-disc pl-5 space-y-2">
                        <li dangerouslySetInnerHTML={{ __html: T.ch3L1 }}/>
                        <li dangerouslySetInnerHTML={{ __html: T.ch3L2 }}/>
                        <li dangerouslySetInnerHTML={{ __html: T.ch3L3 }}/>
                        <li dangerouslySetInnerHTML={{ __html: T.ch3L4 }}/>
                    </ul>
                </Section>
                
                <Section title={T.ch4Title} icon={ImageIcon}>
                    <p>{T.ch4P1}</p>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-4 border border-green-300 dark:border-green-700 rounded-lg bg-green-50 dark:bg-green-900/20">
                            <h5 className="font-bold text-green-800 dark:text-green-300 flex items-center gap-2">
                                <CheckCircleIcon className="w-5 h-5" />
                                {T.ch4CanDoTitle}
                            </h5>
                            <ul className="list-disc pl-5 space-y-1 mt-3 text-sm">
                                <li>{T.ch4CanDoL1}</li>
                                <li>{T.ch4CanDoL2}</li>
                                <li>{T.ch4CanDoL3}</li>
                                <li>{T.ch4CanDoL4}</li>
                                <li>{T.ch4CanDoL5}</li>
                                <li>{T.ch4CanDoL6}</li>
                            </ul>
                        </div>
                        <div className="p-4 border border-red-300 dark:border-red-700 rounded-lg bg-red-50 dark:bg-red-900/20">
                            <h5 className="font-bold text-red-800 dark:text-red-300 flex items-center gap-2">
                                <XIcon className="w-5 h-5" />
                                {T.ch4CannotDoTitle}
                            </h5>
                            <ul className="list-disc pl-5 space-y-1 mt-3 text-sm">
                                <li>{T.ch4CannotDoL1}</li>
                                <li>{T.ch4CannotDoL2}</li>
                                <li>{T.ch4CannotDoL3}</li>
                                <li>{T.ch4CannotDoL4}</li>
                            </ul>
                        </div>
                    </div>
                     <SubSection title={T.ch4s1Title}>
                        <p>{T.ch4s1P1}</p>
                         <ul className="list-disc pl-5 space-y-2">
                            <li dangerouslySetInnerHTML={{ __html: T.ch4s1L1 }} />
                            <li dangerouslySetInnerHTML={{ __html: T.ch4s1L2 }} />
                            <li dangerouslySetInnerHTML={{ __html: T.ch4s1L3 }} />
                        </ul>
                        <p>{T.ch4s1P2}</p>
                    </SubSection>
                </Section>

                <Section title={T.ch5Title} icon={VideoIcon}>
                    <p>{T.ch5P1}</p>
                    <SubSection title={T.ch5s1Title}>
                        <p>{T.ch5s1P1}</p>
                        <p>{T.ch5s1P2}</p>
                    </SubSection>
                    <SubSection title={T.ch5s2Title}>
                        <p>{T.ch5s2P1}</p>
                        <p>{T.ch5s2P2}</p>
                    </SubSection>
                    <SubSection title={T.ch5s3Title}>
                        <p>{T.ch5s3P1}</p>
                        <p>{T.ch5s3P2}</p>
                    </SubSection>
                    <SubSection title={T.ch5s4Title}>
                        <p>{T.ch5s4P1}</p>
                        <p>{T.ch5s4P2}</p>
                    </SubSection>
                </Section>
                
                <Section title={T.ch6Title} icon={RobotIcon}>
                    <p>{T.ch6P1}</p>
                    <SubSection title={T.ch6s1Title}>
                        <p>{T.ch6s1P1} <code className="text-sm font-mono bg-neutral-200 dark:bg-neutral-700 p-1 rounded">gemini-2.5-flash</code></p>
                        <p>{T.ch6s1P2}</p>
                        <p>{T.ch6s1P3}</p>
                    </SubSection>
                    <SubSection title={T.ch6s2Title}>
                        <p>{T.ch6s2P1}</p>
                        <p>{T.ch6s2P2}</p>
                        <ul className="list-disc pl-5 space-y-2 text-sm">
                            <li><code className="text-sm font-mono bg-neutral-200 dark:bg-neutral-700 p-1 rounded">veo-3.1-generate-001</code>: {T.ch6s2L1}</li>
                            <li><code className="text-sm font-mono bg-neutral-200 dark:bg-neutral-700 p-1 rounded">veo-3.1-fast-generate-001</code>: {T.ch6s2L2}</li>
                        </ul>
                    </SubSection>
                    <SubSection title={T.ch6s3Title}>
                        <p>{T.ch6s3P1}</p>
                        <p>{T.ch6s3P2}</p>
                    </SubSection>
                    <SubSection title={T.ch6s4Title}>
                        <p>{T.ch6s4P1} <code className="text-sm font-mono bg-neutral-200 dark:bg-neutral-700 p-1 rounded">Imagen V3 (via proxy)</code></p>
                        <p>{T.ch6s4P2}</p>
                    </SubSection>
                    <SubSection title={T.ch6s5Title}>
                        <p>{T.ch6s5P1} <code className="text-sm font-mono bg-neutral-200 dark:bg-neutral-700 p-1 rounded">imagen-4.0-generate-001</code></p>
                        <p>{T.ch6s5P2}</p>
                    </SubSection>
                </Section>

                <Section title={T.ch7Title} icon={LibraryIcon}>
                    <p>{T.ch7P1}</p>
                    <SubSection title={T.ch7s1Title}>
                        <p>{T.ch7s1P1}</p>
                        <ul className="list-disc pl-5 space-y-2 text-sm">
                            <li dangerouslySetInnerHTML={{ __html: T.ch7s1L1 }}></li>
                        </ul>
                        <p>{T.ch7s1P2}</p>
                    </SubSection>
                </Section>
                
                <Section title={T.ch8Title} icon={SettingsIcon}>
                    <SubSection title={T.ch8s1Title}>
                        <p>{T.ch8s1P1}</p>
                        <p>{T.ch8s1P2}</p>
                    </SubSection>
                    <SubSection title={T.ch8s2Title}>
                        <p>{T.ch8s2P1}</p>
                        <ul className="list-disc pl-5 space-y-2 text-sm">
                            <li><code className="text-sm font-mono bg-neutral-200 dark:bg-neutral-700 p-1 rounded">{'User Database (Settings > User Database)'}</code>: {T.ch8s2L1}</li>
                            <li><code className="text-sm font-mono bg-neutral-200 dark:bg-neutral-700 p-1 rounded">{'Admin Content (Settings > Admin Content)'}</code>: {T.ch8s2L2}</li>
                            <li><code className="text-sm font-mono bg-neutral-200 dark:bg-neutral-700 p-1 rounded">{'Batch Processor (AI Video & Voice > Batch Processor)'}</code>: {T.ch8s2L3}</li>
                            <li><code className="text-sm font-mono bg-neutral-200 dark:bg-neutral-700 p-1 rounded">{'Video Combiner (AI Video & Voice > Video Combiner)'}</code>: {T.ch8s2L4}</li>
                        </ul>
                        <p>{T.ch8s2P2}</p>
                    </SubSection>
                </Section>
                
                <Section title={T.ch9Title} icon={GalleryIcon}>
                    <SubSection title={T.ch9s1Title}>
                        <p>{T.ch9s1P1}</p>
                    </SubSection>
                    <SubSection title={T.ch9s2Title}>
                        <ul className="list-disc pl-5 space-y-2 text-sm">
                            <li dangerouslySetInnerHTML={{ __html: T.ch9s2L1 }}></li>
                            <li dangerouslySetInnerHTML={{ __html: T.ch9s2L2 }}></li>
                            <li dangerouslySetInnerHTML={{ __html: T.ch9s2L3 }}></li>
                        </ul>
                    </SubSection>
                    <SubSection title={T.ch9s3Title}>
                        <p>{T.ch9s3P1}</p>
                    </SubSection>
                </Section>

                <Section title={T.ch10Title} icon={AlertTriangleIcon}>
                    <p>{T.ch10P1}</p>
                    <div className="mt-6 overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="text-xs text-neutral-700 uppercase bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-400">
                                <tr>
                                    <th scope="col" className="px-4 py-3 border border-neutral-300 dark:border-neutral-700">{T.ch10Table.header1}</th>
                                    <th scope="col" className="px-4 py-3 border border-neutral-300 dark:border-neutral-700">{T.ch10Table.header2}</th>
                                    <th scope="col" className="px-4 py-3 border border-neutral-300 dark:border-neutral-700">{T.ch10Table.header3}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b dark:border-neutral-800"><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top font-semibold">{T.ch10Table.row1_1}</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top">{T.ch10Table.row1_2}</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top" dangerouslySetInnerHTML={{ __html: T.ch10Table.row1_3 }}></td></tr>
                                <tr className="border-b dark:border-neutral-800"><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top font-semibold">{T.ch10Table.row2_1}</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top">{T.ch10Table.row2_2}</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top">{T.ch10Table.row2_3}</td></tr>
                                <tr className="border-b dark:border-neutral-800"><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top font-semibold">{T.ch10Table.row3_1}</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top" dangerouslySetInnerHTML={{ __html: T.ch10Table.row3_2 }}></td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top" dangerouslySetInnerHTML={{ __html: T.ch10Table.row3_3 }}></td></tr>
                                <tr className="border-b dark:border-neutral-800"><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top font-semibold">{T.ch10Table.row4_1}</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top">{T.ch10Table.row4_2}</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top" dangerouslySetInnerHTML={{ __html: T.ch10Table.row4_3 }}></td></tr>
                                <tr className="border-b dark:border-neutral-800"><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top font-semibold">{T.ch10Table.row5_1}</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top">{T.ch10Table.row5_2}</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top" dangerouslySetInnerHTML={{ __html: T.ch10Table.row5_3 }}></td></tr>
                                <tr className="border-b dark:border-neutral-800"><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top font-semibold">{T.ch10Table.row6_1}</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top">{T.ch10Table.row6_2}</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top" dangerouslySetInnerHTML={{ __html: T.ch10Table.row6_3 }}></td></tr>
                                <tr className="border-b dark:border-neutral-800"><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top font-semibold">{T.ch10Table.row7_1}</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top">{T.ch10Table.row7_2}</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top" dangerouslySetInnerHTML={{ __html: T.ch10Table.row7_3 }}></td></tr>
                                <tr className="border-b dark:border-neutral-800"><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top font-semibold">{T.ch10Table.row8_1}</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top">{T.ch10Table.row8_2}</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top" dangerouslySetInnerHTML={{ __html: T.ch10Table.row8_3 }}></td></tr>
                                <tr className="border-b dark:border-neutral-800"><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top font-semibold">{T.ch10Table.row9_1}</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top">{T.ch10Table.row9_2}</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top" dangerouslySetInnerHTML={{ __html: T.ch10Table.row9_3 }}></td></tr>
                                <tr className="border-b dark:border-neutral-800"><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top font-semibold">{T.ch10Table.row10_1}</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top">{T.ch10Table.row10_2}</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top">{T.ch10Table.row10_3}</td></tr>
                                <tr className="border-b dark:border-neutral-800"><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top font-semibold">{T.ch10Table.row11_1}</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top">{T.ch10Table.row11_2}</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top" dangerouslySetInnerHTML={{ __html: T.ch10Table.row11_3 }}></td></tr>
                                <tr className="border-b dark:border-neutral-800"><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top font-semibold">{T.ch10Table.row12_1}</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top" dangerouslySetInnerHTML={{ __html: T.ch10Table.row12_2 }}></td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top" dangerouslySetInnerHTML={{ __html: T.ch10Table.row12_3 }}></td></tr>
                            </tbody>
                        </table>
                    </div>
                </Section>
            </div>
        </div>
    );
};

export { GetStartedView };